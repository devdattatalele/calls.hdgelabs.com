"""Per-plan pricing + entitlements for calls.hdgelabs.com.

Each plan grants a number of team members (= phone users), devices, and minutes
of call recording per month. Pricing is in USD; we'll add INR later if needed.

The `polar_product` field is the Polar product ID we send to the Checkout API
when the user clicks Upgrade. It comes from environment variables so we can
swap test/live products without code changes.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    tagline: str
    price_usd: int  # per month
    max_team_members: int
    max_devices: int
    monthly_minutes_limit: int
    polar_product: Optional[str] = None
    featured: bool = False


def all_plans() -> list[Plan]:
    s = get_settings()
    return [
        Plan(
            id="free",
            name="Free",
            tagline="Try it out",
            price_usd=0,
            max_team_members=1,
            max_devices=1,
            monthly_minutes_limit=50,
        ),
        Plan(
            id="starter",
            name="Starter",
            tagline="1 user / 1 device / 1,000 minutes",
            price_usd=15,
            max_team_members=1,
            max_devices=1,
            monthly_minutes_limit=1000,
            polar_product=s.polar_product_starter or None,
            featured=True,
        ),
        Plan(
            id="growth",
            name="Growth",
            tagline="5 users / 5 devices / 5,000 minutes",
            price_usd=59,
            max_team_members=5,
            max_devices=5,
            monthly_minutes_limit=5000,
            polar_product=s.polar_product_growth or None,
        ),
        Plan(
            id="business",
            name="Business",
            tagline="25 users / 25 devices / 25,000 minutes",
            price_usd=249,
            max_team_members=25,
            max_devices=25,
            monthly_minutes_limit=25000,
            polar_product=s.polar_product_business or None,
        ),
    ]


def get_plan(plan_id: str) -> Optional[Plan]:
    for p in all_plans():
        if p.id == plan_id:
            return p
    return None


def entitlements_for(plan_id: str) -> dict:
    p = get_plan(plan_id) or get_plan("free")
    assert p is not None
    return {
        "plan": p.id,
        "max_team_members": p.max_team_members,
        "max_devices": p.max_devices,
        "monthly_minutes_limit": p.monthly_minutes_limit,
    }
