"""Monthly usage rollup + quota enforcement against the `api_usage` table."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException

from app.core.supabase_client import supabase_admin


def _month_range(now: datetime | None = None) -> tuple[date, date]:
    now = now or datetime.now(timezone.utc)
    first = now.replace(day=1).date()
    # next month
    nxt = first.replace(month=first.month % 12 + 1, year=first.year + (1 if first.month == 12 else 0))
    return first, nxt


def month_usage_for_key(api_key_id: str) -> dict:
    db = supabase_admin()
    first, nxt = _month_range()
    res = (
        db.table("api_usage")
        .select("requests, minutes_metered, usage_date")
        .eq("api_key_id", api_key_id)
        .gte("usage_date", first.isoformat())
        .lt("usage_date", nxt.isoformat())
        .execute()
    )
    rows = res.data or []
    total_requests = sum(r["requests"] for r in rows)
    total_minutes = float(sum(Decimal(str(r["minutes_metered"])) for r in rows))
    return {
        "requests": total_requests,
        "minutes_metered": round(total_minutes, 2),
        "month_start": first.isoformat(),
    }


def enforce_monthly_quota(auth) -> None:
    used = month_usage_for_key(auth.key_id)
    if used["minutes_metered"] >= auth.monthly_minutes_limit:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Monthly minutes quota of {auth.monthly_minutes_limit} reached. "
                f"Used {used['minutes_metered']:.2f}."
            ),
        )


def _upsert_usage(api_key_id: str, *, requests: int = 0, minutes: float = 0.0) -> None:
    db = supabase_admin()
    today = date.today().isoformat()
    # Try increment first; if no row, insert.
    existing = (
        db.table("api_usage")
        .select("requests, minutes_metered")
        .eq("api_key_id", api_key_id)
        .eq("usage_date", today)
        .limit(1)
        .execute()
    )
    if existing.data:
        cur = existing.data[0]
        db.table("api_usage").update(
            {
                "requests": cur["requests"] + requests,
                "minutes_metered": float(cur["minutes_metered"]) + minutes,
            }
        ).eq("api_key_id", api_key_id).eq("usage_date", today).execute()
    else:
        db.table("api_usage").insert(
            {
                "api_key_id": api_key_id,
                "usage_date": today,
                "requests": requests,
                "minutes_metered": minutes,
            }
        ).execute()


def increment_request(auth) -> None:
    _upsert_usage(auth.key_id, requests=1)


def increment_minutes(auth, duration_sec: int | float | None) -> None:
    if not duration_sec or duration_sec <= 0:
        return
    minutes = round(float(duration_sec) / 60.0, 2)
    _upsert_usage(auth.key_id, minutes=minutes)
