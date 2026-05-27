from fastapi import APIRouter, Header, HTTPException

from app.core.security import _bearer, _decode_supabase_jwt
from app.core.supabase_client import supabase_admin
from app.models.schemas import CompanyOut, OnboardRequest


router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


@router.post("/onboard", response_model=CompanyOut)
def onboard(body: OnboardRequest, authorization: str | None = Header(None)):
    """First-run: create the developer's `companies` row.

    Called from the /onboard page after Supabase signup. The user has a valid
    JWT but no `companies` row yet, so `current_developer` would 403.
    """
    token = _bearer(authorization)
    claims = _decode_supabase_jwt(token)
    user_id = claims["sub"]
    db = supabase_admin()

    existing = (
        db.table("companies").select("*").eq("owner_user_id", user_id).limit(1).execute()
    )
    if existing.data:
        # Idempotent: just return it.
        return CompanyOut(**existing.data[0])

    inserted = (
        db.table("companies")
        .insert(
            {
                "owner_user_id": user_id,
                "name": body.name,
                "role": body.role,
                "size": body.size,
                "website": body.website,
                "industry": body.industry,
            }
        )
        .execute()
    )
    rows = inserted.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Could not create company")
    return CompanyOut(**rows[0])
