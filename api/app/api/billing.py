"""Billing endpoints — pricing, checkout, customer portal, Polar webhook."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request

from app.core.config import get_settings
from app.core.security import Developer, current_developer
from app.core.supabase_client import supabase_admin
from app.services import polar
from app.services.plans import all_plans, get_plan


log = logging.getLogger("billing")
router = APIRouter(prefix="/v1/billing", tags=["billing"])


@router.get("/plans")
def list_plans():
    return [
        {
            "id": p.id,
            "name": p.name,
            "tagline": p.tagline,
            "price_usd": p.price_usd,
            "max_team_members": p.max_team_members,
            "max_devices": p.max_devices,
            "monthly_minutes_limit": p.monthly_minutes_limit,
            "featured": p.featured,
            "contact_only": p.contact_only,
            "can_purchase": (
                False
                if p.contact_only
                else (bool(p.polar_product) or polar.is_mock())
            ),
        }
        for p in all_plans()
    ]


@router.get("/summary")
def billing_summary(dev: Developer = Depends(current_developer)):
    """Returns the company's current plan + usage + entitlements."""
    db = supabase_admin()
    row = (
        db.table("company_billing")
        .select("*")
        .eq("company_id", dev.company_id)
        .limit(1)
        .execute()
        .data
    )
    if not row:
        return {
            "plan": "free",
            "subscription_status": "free",
            "minutes_used_this_month": 0,
            "monthly_minutes_limit": 50,
            "max_team_members": 1,
            "max_devices": 1,
            "active_members": 0,
            "active_devices": 0,
        }
    return row[0]


@router.post("/checkout")
async def checkout(
    body: dict = Body(...),
    dev: Developer = Depends(current_developer),
):
    plan_id = body.get("plan")
    plan = get_plan(plan_id or "")
    if not plan:
        raise HTTPException(status_code=400, detail="Unknown plan")
    if plan.price_usd == 0:
        raise HTTPException(status_code=400, detail="Free plan does not need checkout")
    if not plan.polar_product and not polar.is_mock():
        raise HTTPException(status_code=400, detail="Plan is not purchasable yet")

    s = get_settings()
    success_url = f"{s.dashboard_url}/settings/billing?session_id={{CHECKOUT_ID}}&plan={plan.id}"
    try:
        result = await polar.create_checkout(
            product_id=plan.polar_product or f"mock-{plan.id}",
            success_url=success_url,
            customer_email=dev.email,
            metadata={"company_id": dev.company_id, "plan": plan.id},
        )
    except polar.PolarError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"checkout_url": result.get("url") or result.get("checkout_url"), "mock": result.get("mock", False)}


@router.post("/mock/confirm")
def mock_confirm(body: dict = Body(...), dev: Developer = Depends(current_developer)):
    """Local dev only: flip the developer's plan immediately."""
    if not polar.is_mock():
        raise HTTPException(status_code=400, detail="Not in mock mode")
    plan = get_plan(body.get("plan") or "")
    if not plan:
        raise HTTPException(status_code=400, detail="Unknown plan")
    db = supabase_admin()
    db.table("companies").update(
        {
            "plan": plan.id,
            "subscription_status": "active",
            "max_team_members": plan.max_team_members,
            "max_devices": plan.max_devices,
            "monthly_minutes_limit": plan.monthly_minutes_limit,
        }
    ).eq("id", dev.company_id).execute()
    return {"ok": True, "plan": plan.id}


@router.post("/portal")
async def open_portal(dev: Developer = Depends(current_developer)):
    s = get_settings()
    if not dev.company.get("polar_customer_id") and not polar.is_mock():
        raise HTTPException(status_code=400, detail="No subscription yet")
    try:
        url = await polar.open_customer_portal(
            polar_customer_id=dev.company.get("polar_customer_id") or "",
            return_url=f"{s.dashboard_url}/settings/billing",
        )
    except polar.PolarError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"url": url}


# --- Webhook ----------------------------------------------------------------


@router.post("/webhook")
async def webhook(request: Request):
    body = await request.body()
    try:
        event = polar.verify_webhook(body=body, headers=dict(request.headers))
    except polar.PolarError as exc:
        log.warning("polar webhook rejected: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    etype = event.get("type") or event.get("event")
    data = event.get("data") or {}
    metadata = data.get("metadata") or {}
    company_id = metadata.get("company_id")
    plan_id = metadata.get("plan")

    if not company_id:
        # Try to find via existing polar_customer_id / polar_subscription_id
        customer = (data.get("customer") or {}).get("id") or data.get("customer_id")
        sub_id = data.get("id") if "subscription" in (etype or "") else data.get("subscription_id")
        db = supabase_admin()
        if customer:
            row = (
                db.table("companies")
                .select("id, plan")
                .eq("polar_customer_id", customer)
                .limit(1)
                .execute()
                .data
            )
            if row:
                company_id = row[0]["id"]
        if not company_id and sub_id:
            row = (
                db.table("companies")
                .select("id, plan")
                .eq("polar_subscription_id", sub_id)
                .limit(1)
                .execute()
                .data
            )
            if row:
                company_id = row[0]["id"]

    if not company_id:
        log.info("ignoring polar webhook %s (no company)", etype)
        return {"ok": True}

    db = supabase_admin()
    upd: dict = {}

    if etype in ("subscription.created", "subscription.active", "subscription.updated"):
        plan = get_plan(plan_id or "starter")
        if plan:
            upd.update(
                {
                    "plan": plan.id,
                    "subscription_status": "active",
                    "max_team_members": plan.max_team_members,
                    "max_devices": plan.max_devices,
                    "monthly_minutes_limit": plan.monthly_minutes_limit,
                }
            )
        cust = (data.get("customer") or {}).get("id") or data.get("customer_id")
        if cust:
            upd["polar_customer_id"] = cust
        sub_id = data.get("id")
        if sub_id:
            upd["polar_subscription_id"] = sub_id
        end = data.get("current_period_end")
        if end:
            upd["current_period_end"] = end

    elif etype in ("subscription.canceled", "subscription.revoked"):
        free = get_plan("free")
        assert free is not None
        upd.update(
            {
                "plan": "free",
                "subscription_status": "canceled" if etype == "subscription.canceled" else "revoked",
                "max_team_members": free.max_team_members,
                "max_devices": free.max_devices,
                "monthly_minutes_limit": free.monthly_minutes_limit,
            }
        )

    if upd:
        db.table("companies").update(upd).eq("id", company_id).execute()
    return {"ok": True}
