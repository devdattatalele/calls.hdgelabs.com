"""On-demand transcription endpoints for the dashboard.

The local Whisper worker (HDGEcalls app/tools/local-transcriber) polls
`calls.transcription_status = 'pending'` and writes transcripts back. This
router gives the dashboard two things:

- POST /v1/dashboard/transcribe   — enqueue selected calls (flip to 'pending').
- GET  /v1/dashboard/transcribe/health — proxy the worker's /status so the UI
                                          can show "Transcriber online".

The worker itself is reached through a Cloudflare Tunnel at
transcribe.calls.hdgelabs.com (see docs/cloudflared-transcriber.md). The
tunnel is optional — its absence only hides the status pill; transcription
still runs.
"""

from __future__ import annotations

import os
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import Developer, current_developer
from app.core.supabase_client import supabase_admin


router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])


WORKER_HEALTH_URL = os.getenv(
    "TRANSCRIBER_HEALTH_URL",
    "https://transcribe.calls.hdgelabs.com/status",
)
WORKER_HEALTH_TIMEOUT_SEC = float(os.getenv("TRANSCRIBER_HEALTH_TIMEOUT_SEC", "2.0"))
WORKER_HEALTH_CACHE_SEC = float(os.getenv("TRANSCRIBER_HEALTH_CACHE_SEC", "10"))


class TranscribeRequest(BaseModel):
    call_ids: list[str] = Field(..., min_length=1, max_length=50)


class SkippedItem(BaseModel):
    id: str
    reason: str


class TranscribeResponse(BaseModel):
    queued: int
    skipped: list[SkippedItem]


_ENQUEUABLE_STATUSES = {"skipped", "failed"}


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe(
    body: TranscribeRequest,
    dev: Developer = Depends(current_developer),
):
    """Flip selected calls to transcription_status='pending'.

    Authz: each call must belong to the developer's company AND have a
    recording attached AND currently be in 'skipped' or 'failed' state. Rows
    already 'pending'/'processing'/'done' are reported in `skipped` so the UI
    can explain. We never bump a 'done' row back to 'pending' from this path
    — re-transcription is a separate explicit action (TODO when needed).
    """
    db = supabase_admin()

    # Fetch all referenced rows in one query, scoped to the dev's company.
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
            # Supabase python client returns data=None on RPC-level failures.
            raise HTTPException(status_code=500, detail="enqueue update failed")

    return TranscribeResponse(queued=len(queue), skipped=skipped)


# In-process cache so a busy dashboard doesn't hammer the tunnel.
_health_cache: dict[str, object] = {"at": 0.0, "value": None}


@router.get("/transcribe/health")
def transcribe_health(_: Developer = Depends(current_developer)):
    """Proxy the worker's /status (via Cloudflare Tunnel) with a 10 s cache."""
    now = time.monotonic()
    cached_at = float(_health_cache.get("at", 0.0))  # type: ignore[arg-type]
    if _health_cache.get("value") is not None and now - cached_at < WORKER_HEALTH_CACHE_SEC:
        return _health_cache["value"]

    try:
        resp = httpx.get(WORKER_HEALTH_URL, timeout=WORKER_HEALTH_TIMEOUT_SEC)
        if resp.status_code == 200:
            payload = resp.json()
        else:
            payload = {"ok": False, "reason": f"http_{resp.status_code}"}
    except Exception as exc:  # noqa: BLE001 - opaque to clients
        payload = {"ok": False, "reason": "unreachable", "error": str(exc)[:200]}

    _health_cache["at"] = now
    _health_cache["value"] = payload
    return payload
