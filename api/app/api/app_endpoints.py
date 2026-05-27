"""Endpoints called by the HDGEcalls Android app, authed with the team
member's Supabase JWT."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import get_settings
from app.core.security import TeamMember, current_team_member
from app.core.supabase_client import supabase_admin
from app.models.schemas import (
    AppMeResponse,
    CompanyOut,
    UploadSignRequest,
    UploadSignResponse,
)


router = APIRouter(prefix="/v1/app", tags=["app"])


PHONE_RE = re.compile(r"[^\d+]")


def sanitize_phone(p: str | None) -> str:
    if not p:
        return "unknown"
    cleaned = PHONE_RE.sub("", p)
    # Keep leading + only if it's at index 0
    if cleaned.startswith("+"):
        cleaned = "+" + cleaned.lstrip("+")
    cleaned = cleaned.replace("+", "", 1) if cleaned.startswith("++") else cleaned
    return cleaned or "unknown"


@router.get("/me", response_model=AppMeResponse)
def me(member: TeamMember = Depends(current_team_member)):
    db = supabase_admin()
    res = db.table("companies").select("*").eq("id", member.company_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Company not found")
    company = res.data[0]
    return AppMeResponse(
        user_id=member.user_id,
        email=member.email,
        member_label=member.label,
        company=CompanyOut(**company),
    )


@router.post("/uploads/sign", response_model=UploadSignResponse)
def sign_upload(body: UploadSignRequest, member: TeamMember = Depends(current_team_member)):
    settings = get_settings()
    db = supabase_admin()

    try:
        started = datetime.fromisoformat(body.started_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Bad started_at: {exc}") from exc
    started = started.astimezone(timezone.utc)

    ext = body.ext.lower().lstrip(".") or "m4a"
    if ext not in {"m4a", "mp3", "mp4", "wav", "aac", "ogg", "amr", "3gp"}:
        raise HTTPException(status_code=400, detail="Unsupported audio extension")

    day = started.strftime("%Y-%m-%d")
    hms = started.strftime("%H%M%S")
    call_short = body.call_id.replace("-", "")[:8]
    phone_seg = sanitize_phone(body.phone_number)

    path = f"{member.user_id}/by-number/{phone_seg}/{day}/{hms}_{call_short}.{ext}"

    # Create a signed upload URL valid for 5 minutes.
    try:
        signed = db.storage.from_(settings.recordings_bucket).create_signed_upload_url(path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not sign upload: {exc}") from exc

    url = signed.get("signed_url") or signed.get("signedUrl") or signed.get("url")
    token = signed.get("token")
    if not url:
        raise HTTPException(status_code=500, detail="Sign returned no URL")

    return UploadSignResponse(
        url=url,
        token=token,
        recording_storage_path=path,
        company_id=member.company_id,
        expires_in=300,
    )
