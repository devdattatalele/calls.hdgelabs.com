"""Recording signed-URL endpoint for the dashboard.

The dashboard uses this instead of `supabase.storage.createSignedUrl(...)`
directly, because the path's first folder is the team member's user_id — not
the developer's — and storage RLS for the company owner is unreliable when
paths contain special characters like `+` in phone numbers.

This endpoint runs as service-role on the backend, but only after verifying:
  - the developer's JWT
  - the call belongs to a company owned by them
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.core.security import Developer, current_developer
from app.core.supabase_client import supabase_admin


router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


@router.get("/recordings/sign")
def sign_recording(
    call_id: str = Query(..., description="UUID of the call row"),
    expires_in: int = Query(600, ge=30, le=3600),
    dev: Developer = Depends(current_developer),
):
    settings = get_settings()
    db = supabase_admin()
    res = (
        db.table("calls")
        .select("recording_storage_path, company_id, user_id")
        .eq("id", call_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Call not found")
    row = res.data[0]
    # Authz: call must belong to the dev's company, OR (fallback for legacy
    # rows without company_id) belong to the dev themselves.
    owns = row.get("company_id") == dev.company_id or row.get("user_id") == dev.user_id
    if not owns:
        raise HTTPException(status_code=403, detail="Forbidden")
    path = row.get("recording_storage_path")
    if not path:
        raise HTTPException(status_code=404, detail="No recording")

    try:
        signed = db.storage.from_(settings.recordings_bucket).create_signed_url(
            path, expires_in
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Sign failed: {exc}") from exc

    url = signed.get("signed_url") or signed.get("signedURL") or signed.get("signedUrl")
    if not url:
        raise HTTPException(status_code=500, detail="No URL returned")
    return {"url": url, "expires_in": expires_in}
