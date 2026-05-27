"""Thin async wrapper around Polar's Checkout + Webhook + Customer Portal APIs.

We use plain `httpx` (matching hdgebot's approach). Supports a "mock" mode for
local development that returns fake URLs without ever talking to Polar.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Any

import httpx

from app.core.config import get_settings


POLAR_API = "https://api.polar.sh/v1"


class PolarError(Exception):
    pass


def is_mock() -> bool:
    return get_settings().billing_mode.lower() != "live"


async def create_checkout(
    *,
    product_id: str,
    success_url: str,
    customer_email: str | None,
    metadata: dict[str, Any],
) -> dict:
    s = get_settings()
    if is_mock():
        # Fake a checkout URL — dashboard intercepts and calls `/v1/billing/mock/confirm`
        sid = f"mock_{uuid.uuid4().hex[:12]}"
        plan = metadata.get("plan", "starter")
        url = (
            f"{s.dashboard_url}/settings/billing"
            f"?session_id={sid}&plan={plan}&mock=1"
        )
        return {"id": sid, "url": url, "metadata": metadata, "mock": True}

    if not s.polar_access_token:
        raise PolarError("POLAR_ACCESS_TOKEN is not configured")

    payload = {
        "product_id": product_id,
        "success_url": success_url,
        "customer_email": customer_email,
        "metadata": metadata,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{POLAR_API}/checkouts/",
            headers={"Authorization": f"Bearer {s.polar_access_token}"},
            json=payload,
        )
    if r.status_code >= 400:
        raise PolarError(f"Polar checkout failed: {r.status_code} {r.text}")
    return r.json()


async def open_customer_portal(*, polar_customer_id: str, return_url: str) -> str:
    s = get_settings()
    if is_mock():
        return f"{s.dashboard_url}/settings/billing?portal=mock"
    if not s.polar_access_token:
        raise PolarError("POLAR_ACCESS_TOKEN is not configured")
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{POLAR_API}/customer-portal/sessions",
            headers={"Authorization": f"Bearer {s.polar_access_token}"},
            json={"customer_id": polar_customer_id, "return_url": return_url},
        )
    if r.status_code >= 400:
        raise PolarError(f"Portal failed: {r.status_code} {r.text}")
    return r.json().get("url") or r.json().get("customer_portal_url")


# --- Webhook verification ---------------------------------------------------


def verify_webhook(*, body: bytes, headers: dict[str, str]) -> dict:
    """Verify a Polar 'Standard Webhooks'-style signature.

    Polar sends `webhook-id`, `webhook-timestamp`, `webhook-signature`.
    Signature format: `v1,<base64 hmac sha256 of "{id}.{ts}.{body}">`
    """
    s = get_settings()
    if is_mock() and not s.polar_webhook_secret:
        # Accept unsigned bodies in mock mode for easier local testing.
        return json.loads(body or b"{}")

    secret = s.polar_webhook_secret
    if not secret:
        raise PolarError("POLAR_WEBHOOK_SECRET not configured")

    raw_id = headers.get("webhook-id") or headers.get("Webhook-Id")
    raw_ts = headers.get("webhook-timestamp") or headers.get("Webhook-Timestamp")
    raw_sig = headers.get("webhook-signature") or headers.get("Webhook-Signature")
    if not raw_id or not raw_ts or not raw_sig:
        raise PolarError("missing webhook signature headers")

    if abs(int(time.time()) - int(raw_ts)) > 300:
        raise PolarError("webhook timestamp too old")

    # Polar strips `whsec_` prefix if present; secret is base64-encoded.
    cleaned = secret.removeprefix("whsec_")
    try:
        key = base64.b64decode(cleaned)
    except Exception:
        key = cleaned.encode()

    msg = f"{raw_id}.{raw_ts}.".encode() + body
    expected = base64.b64encode(hmac.new(key, msg, hashlib.sha256).digest()).decode()

    # `raw_sig` is "v1,<sig> v1,<sig> ..." (space-separated for rotated secrets)
    sigs = [s.split(",", 1)[1] for s in raw_sig.split() if "," in s]
    if not any(hmac.compare_digest(expected, s) for s in sigs):
        raise PolarError("webhook signature mismatch")

    return json.loads(body or b"{}")
