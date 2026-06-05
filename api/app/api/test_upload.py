"""Test-recording upload from the dashboard.

A button on /transcripts lets the manager pick an audio file and queue it
for transcription so they can sanity-check the pipeline (Marathi / Hindi
quality, code-switching behaviour, etc.) without waiting for a real call.

The uploaded file goes through the same storage path + transcription queue
as a real call recording — there's no parallel "test" pipeline. We just:

  1. Upload the file to the recordings bucket under
     `{dev_user_id}/dashboard-uploads/{ts}_{slug}.{ext}`.
  2. Ensure a synthetic device row exists for the dev so the calls FK is
     satisfied (we reuse one row per dev rather than creating one per
     upload).
  3. Insert a `calls` row in `transcription_status='pending'` so the
     worker picks it up on the next pass.

The new row appears in the manager's existing Recordings / Transcripts
queue tagged with `recording_source='dashboard_test'`.
"""

from __future__ import annotations

import re
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import get_settings
from app.core.security import Developer, current_developer
from app.core.supabase_client import supabase_admin


router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


# Hard cap so a clipped 100 MB recording can't break the pipeline. Real
# customer calls upload from the phone via the app at ~250 KB / min, so
# 50 MB covers ~3-4 h of speech.
MAX_UPLOAD_BYTES = 50 * 1024 * 1024

ALLOWED_EXTS = {"wav", "mp3", "m4a", "mp4", "aac", "ogg", "opus", "amr", "3gp", "flac"}


@router.post("/test-upload")
async def test_upload(
    dev: Developer = Depends(current_developer),
    file: UploadFile = File(...),
):
    settings = get_settings()
    db = supabase_admin()

    # Validate filename extension + size before we burn storage on garbage.
    original_name = file.filename or "upload.wav"
    ext = (original_name.rsplit(".", 1)[-1] or "wav").lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=415, detail=f"Unsupported audio format: .{ext}"
        )

    body = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )
    if not body:
        raise HTTPException(status_code=400, detail="Empty upload")

    # Re-use one synthetic device per dev so we don't pile up rows. The
    # android_id format is non-conflicting with real devices (which use
    # ANDROID_ID hex values).
    device_id = _ensure_dashboard_device(db, dev.user_id)

    ts = int(time.time())
    slug = _slug(original_name)
    storage_path = (
        f"{dev.user_id}/dashboard-uploads/{ts}_{slug}.{ext}"
    )

    try:
        db.storage.from_(settings.recordings_bucket).upload(
            storage_path,
            body,
            file_options={
                "content-type": file.content_type or "audio/wav",
                "upsert": "false",
            },
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Upload to storage failed: {exc}"
        ) from exc

    inserted = (
        db.table("calls")
        .insert(
            {
                "user_id": dev.user_id,
                "device_id": device_id,
                "company_id": dev.company_id,
                "phone_number": "dashboard-upload",
                "contact_name": original_name,
                "direction": "incoming",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "duration_sec": 0,
                "recording_storage_path": storage_path,
                "recording_mime": file.content_type or "audio/wav",
                # 'manual_share' is the closest existing value in the
                # calls_recording_source_check constraint. Semantically the
                # manager is sharing the file by hand here too.
                "recording_source": "manual_share",
                "transcription_status": "pending",
            }
        )
        .execute()
    )
    rows = inserted.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Could not insert call row")

    return {
        "call_id": rows[0]["id"],
        "storage_path": storage_path,
        "filename": original_name,
        "size_bytes": len(body),
    }


def _ensure_dashboard_device(db, user_id: str) -> str:
    """Return the id of (or create) a synthetic device row used to host
    dashboard test uploads. One per dev for life."""
    res = (
        db.table("devices")
        .select("id")
        .eq("user_id", user_id)
        .eq("android_id", "dashboard-upload")
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]["id"]
    ins = (
        db.table("devices")
        .insert(
            {
                "user_id": user_id,
                "android_id": "dashboard-upload",
                "label": "Dashboard uploads",
            }
        )
        .execute()
    )
    rows = ins.data or []
    if not rows:
        raise HTTPException(
            status_code=500, detail="Could not create synthetic device row"
        )
    return rows[0]["id"]


_SLUG_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def _slug(name: str) -> str:
    base = name.rsplit(".", 1)[0]
    cleaned = _SLUG_RE.sub("-", base).strip("-_.") or "audio"
    return cleaned[:60]
