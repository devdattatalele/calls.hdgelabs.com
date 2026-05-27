from fastapi import APIRouter, Depends, HTTPException

from app.core.security import Developer, current_developer
from app.core.supabase_client import supabase_admin
from app.models.schemas import (
    CreateMemberRequest,
    CreateMemberResponse,
    ResetPasswordRequest,
)


router = APIRouter(prefix="/v1/team", tags=["team"])


@router.post("/members", response_model=CreateMemberResponse)
def create_member(body: CreateMemberRequest, dev: Developer = Depends(current_developer)):
    db = supabase_admin()
    # 1. Create auth user (auto-confirmed so they can immediately sign in on the app).
    try:
        created = db.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
            }
        )
    except Exception as exc:  # gotrue exceptions can be a few different types
        raise HTTPException(status_code=400, detail=f"Could not create user: {exc}") from exc

    user = getattr(created, "user", None) or created.get("user")  # SDK variant tolerance
    if not user:
        raise HTTPException(status_code=500, detail="Auth user creation returned no user")
    new_user_id = user.id if hasattr(user, "id") else user["id"]

    # 2. Membership row
    db.table("company_members").insert(
        {
            "company_id": dev.company_id,
            "user_id": new_user_id,
            "invited_email": body.email,
            "label": body.label,
        }
    ).execute()

    return CreateMemberResponse(user_id=new_user_id)


@router.post("/members/{user_id}/reset-password")
def reset_password(
    user_id: str,
    body: ResetPasswordRequest,
    dev: Developer = Depends(current_developer),
):
    db = supabase_admin()
    # Verify the target user is a member of the current company
    res = (
        db.table("company_members")
        .select("user_id")
        .eq("user_id", user_id)
        .eq("company_id", dev.company_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Member not found")
    try:
        db.auth.admin.update_user_by_id(user_id, {"password": body.password})
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not update password: {exc}") from exc
    return {"ok": True}


@router.post("/members/{user_id}/deactivate")
def deactivate(user_id: str, dev: Developer = Depends(current_developer)):
    db = supabase_admin()
    res = (
        db.table("company_members")
        .update({"deactivated_at": "now()"})
        .eq("user_id", user_id)
        .eq("company_id", dev.company_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Member not found")
    # Ban the auth user so existing sessions can't refresh / log in.
    try:
        db.auth.admin.update_user_by_id(user_id, {"ban_duration": "8760h"})
    except Exception:
        pass
    return {"ok": True}
