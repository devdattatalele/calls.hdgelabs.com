"""On-demand transcription endpoints for the dashboard.

The local Whisper worker (HDGEcalls app/tools/local-transcriber) polls
`calls.transcription_status = 'pending'` and writes transcripts back. This
router gives the dashboard two things:

- POST /v1/dashboard/transcribe   — enqueue selected calls (flip to 'pending').
- GET  /v1/dashboard/transcribe/health — return the worker's liveness, sourced
                                          from public.transcriber_status (the
                                          worker upserts its heartbeat there).

The heartbeat path means the dashboard never needs a network route into the
Mac — Supabase is the meeting point both sides already have credentials for.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import Developer, current_developer
from app.core.supabase_client import supabase_admin


router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


# A heartbeat older than this is "stale" → pill goes red even though a row
# exists. Worker heartbeats once per pass (3–10 s), so 90 s is generous.
HEARTBEAT_STALE_SEC = 90
HEALTH_CACHE_SEC = 5


class TranscribeRequest(BaseModel):
    call_ids: list[str] = Field(..., min_length=1, max_length=50)


class SkippedItem(BaseModel):
    id: str
    reason: str


class TranscribeResponse(BaseModel):
    queued: int
    skipped: list[SkippedItem]


# 'done' is included so the manager can re-transcribe a bad result (e.g. when
# we change the Whisper language or model). The worker treats this as a fresh
# job — the new transcript overwrites the old.
_ENQUEUABLE_STATUSES = {"skipped", "failed", "done"}


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe(
    body: TranscribeRequest,
    dev: Developer = Depends(current_developer),
):
    """Flip selected calls to transcription_status='pending'.

    Authz: each call must belong to the developer's company AND have a
    recording attached AND currently be in 'skipped' or 'failed' state.
    """
    db = supabase_admin()

    res = (
        db.table("calls")
        .select("id, company_id, recording_storage_path, transcription_status")
        .in_("id", body.call_ids)
        .eq("company_id", dev.company_id)
        .execute()
    )
    rows = res.data or []
    found = {r["id"]: r for r in rows}

    queue: list[str] = []
    skipped: list[SkippedItem] = []
    for call_id in body.call_ids:
        row = found.get(call_id)
        if row is None:
            skipped.append(SkippedItem(id=call_id, reason="not_found_or_forbidden"))
            continue
        if not row.get("recording_storage_path"):
            skipped.append(SkippedItem(id=call_id, reason="no_recording"))
            continue
        status = row.get("transcription_status") or "skipped"
        if status not in _ENQUEUABLE_STATUSES:
            skipped.append(SkippedItem(id=call_id, reason=f"status_{status}"))
            continue
        queue.append(call_id)

    if queue:
        upd = (
            db.table("calls")
            .update({"transcription_status": "pending"})
            .in_("id", queue)
            .eq("company_id", dev.company_id)
            .execute()
        )
        if upd.data is None:
            raise HTTPException(status_code=500, detail="enqueue update failed")

    return TranscribeResponse(queued=len(queue), skipped=skipped)


# In-process cache so a busy dashboard doesn't query Supabase on every tick.
_health_cache: dict[str, object] = {"at": 0.0, "value": None}


@router.get("/transcribe/health")
def transcribe_health(_: Developer = Depends(current_developer)):
    """Report the most recent worker heartbeat from public.transcriber_status.

    Anyone with a dashboard JWT can see this — it's per-account but the worker
    is global to the platform (single Mac, all customers), so leaking presence
    is harmless. We never expose the SUPABASE_SERVICE_ROLE_KEY or the worker's
    network address.
    """
    now = time.monotonic()
    cached_at = float(_health_cache.get("at", 0.0))  # type: ignore[arg-type]
    if _health_cache.get("value") is not None and now - cached_at < HEALTH_CACHE_SEC:
        return _health_cache["value"]

    db = supabase_admin()
    res = (
        db.table("transcriber_status")
        .select(
            "worker_id, provider, started_at, last_heartbeat, last_pass_at,"
            " jobs_in_flight, jobs_done_today, jobs_failed_today, last_error"
        )
        .order("last_heartbeat", desc=True)
        .limit(1)
        .execute()
    )
    rows = res.data or []

    payload: dict[str, object]
    if not rows:
        payload = {"ok": False, "reason": "no_worker_yet"}
    else:
        row = rows[0]
        last_hb_str = row.get("last_heartbeat")
        try:
            last_hb = datetime.fromisoformat(str(last_hb_str).replace("Z", "+00:00"))
        except Exception:
            last_hb = None
        age_sec: Optional[float] = None
        if last_hb is not None:
            age_sec = (datetime.now(timezone.utc) - last_hb).total_seconds()
        stale = age_sec is None or age_sec > HEARTBEAT_STALE_SEC
        payload = {
            "ok": not stale,
            "reason": "stale" if stale else None,
            "age_sec": age_sec,
            **row,
        }

    _health_cache["at"] = now
    _health_cache["value"] = payload
    return payload
