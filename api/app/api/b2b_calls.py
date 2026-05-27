"""B2B export endpoints, authed by API key."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.security import ApiKeyAuth, current_api_key
from app.core.supabase_client import supabase_admin
from app.core.usage import increment_minutes
from app.models.schemas import (
    CallDetailOut,
    CallListResponse,
    CallOut,
    DeviceOut,
    TranscriptOut,
)


router = APIRouter(prefix="/v1", tags=["b2b"])


def _row_to_call(r: dict) -> CallOut:
    return CallOut(
        id=r["id"],
        started_at=r["started_at"],
        duration_sec=r.get("duration_sec") or 0,
        direction=r.get("direction"),
        phone_number=r.get("phone_number"),
        contact_name=r.get("contact_name"),
        device_id=r["device_id"],
        team_member_id=r["user_id"],
        has_recording=bool(r.get("recording_storage_path")),
        transcription_status=r.get("transcription_status") or "pending",
    )


@router.get("/calls", response_model=CallListResponse)
def list_calls(
    auth: ApiKeyAuth = Depends(current_api_key),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    direction: Optional[str] = None,
    device_id: Optional[str] = None,
    team_member_id: Optional[str] = None,
    number: Optional[str] = None,
    has_recording: Optional[bool] = None,
    has_transcript: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    cursor: Optional[str] = None,
):
    db = supabase_admin()
    q = (
        db.table("calls")
        .select("*")
        .eq("company_id", auth.company_id)
        .order("started_at", desc=True)
        .order("id", desc=True)
        .limit(limit)
    )
    if from_:
        q = q.gte("started_at", from_)
    if to:
        q = q.lte("started_at", to)
    if direction:
        q = q.eq("direction", direction)
    if device_id:
        q = q.eq("device_id", device_id)
    if team_member_id:
        q = q.eq("user_id", team_member_id)
    if number:
        q = q.ilike("phone_number", f"%{number}%")
    if has_recording:
        q = q.not_.is_("recording_storage_path", "null")
    if has_transcript:
        q = q.eq("transcription_status", "done")
    if cursor:
        # cursor = "<started_at>|<id>"
        try:
            cur_ts, cur_id = cursor.split("|", 1)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Bad cursor") from exc
        q = q.or_(f"started_at.lt.{cur_ts},and(started_at.eq.{cur_ts},id.lt.{cur_id})")

    rows = (q.execute().data) or []
    items = [_row_to_call(r) for r in rows]
    next_cursor = None
    if len(rows) == limit:
        last = rows[-1]
        next_cursor = f"{last['started_at']}|{last['id']}"
    return CallListResponse(items=items, next_cursor=next_cursor)


@router.get("/calls/{call_id}", response_model=CallDetailOut)
def get_call(call_id: str, auth: ApiKeyAuth = Depends(current_api_key)):
    db = supabase_admin()
    res = (
        db.table("calls")
        .select("*")
        .eq("company_id", auth.company_id)
        .eq("id", call_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Call not found")
    r = res.data[0]
    base = _row_to_call(r).model_dump()
    base.update(
        transcript=r.get("transcript"),
        transcript_segments=r.get("transcript_segments"),
        transcript_provider=r.get("transcript_provider"),
    )
    return CallDetailOut(**base)


@router.get("/calls/{call_id}/recording")
def get_recording(call_id: str, auth: ApiKeyAuth = Depends(current_api_key)):
    settings = get_settings()
    db = supabase_admin()
    res = (
        db.table("calls")
        .select("recording_storage_path, duration_sec")
        .eq("company_id", auth.company_id)
        .eq("id", call_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Call not found")
    path = res.data[0].get("recording_storage_path")
    if not path:
        raise HTTPException(status_code=404, detail="No recording attached")

    try:
        signed = db.storage.from_(settings.recordings_bucket).create_signed_url(
            path, 300
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not sign URL: {exc}") from exc

    url = signed.get("signed_url") or signed.get("signedURL") or signed.get("signedUrl")
    if not url:
        raise HTTPException(status_code=500, detail="Sign returned no URL")

    # Meter usage
    increment_minutes(auth, res.data[0].get("duration_sec"))
    return RedirectResponse(url, status_code=302)


@router.get("/calls/{call_id}/transcript", response_model=TranscriptOut)
def get_transcript(call_id: str, auth: ApiKeyAuth = Depends(current_api_key)):
    db = supabase_admin()
    res = (
        db.table("calls")
        .select("id, transcript, transcript_segments, transcript_provider, transcription_status")
        .eq("company_id", auth.company_id)
        .eq("id", call_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Call not found")
    r = res.data[0]
    if r.get("transcription_status") != "done":
        raise HTTPException(status_code=409, detail=f"Transcript not ready ({r.get('transcription_status')})")
    return TranscriptOut(
        call_id=r["id"],
        transcript=r.get("transcript"),
        segments=r.get("transcript_segments"),
        provider=r.get("transcript_provider"),
    )


@router.get("/devices", response_model=list[DeviceOut])
def list_devices(auth: ApiKeyAuth = Depends(current_api_key)):
    db = supabase_admin()
    res = (
        db.table("devices")
        .select("id, label, android_id, last_synced_at, user_id")
        .eq("company_id", auth.company_id)
        .order("last_synced_at", desc=True)
        .execute()
    )
    return [
        DeviceOut(
            id=r["id"],
            label=r.get("label"),
            android_id=r["android_id"],
            last_synced_at=r.get("last_synced_at"),
            team_member_id=r["user_id"],
        )
        for r in (res.data or [])
    ]
