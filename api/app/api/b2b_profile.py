from fastapi import APIRouter, Depends, HTTPException

from app.core.security import ApiKeyAuth, current_api_key
from app.core.supabase_client import supabase_admin
from app.core.usage import month_usage_for_key
from app.models.schemas import CompanyOut, UsageOut


router = APIRouter(prefix="/v1", tags=["b2b"])


@router.get("/profile", response_model=CompanyOut)
def profile(auth: ApiKeyAuth = Depends(current_api_key)):
    db = supabase_admin()
    res = db.table("companies").select("*").eq("id", auth.company_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyOut(**res.data[0])


@router.get("/usage", response_model=UsageOut)
def usage(auth: ApiKeyAuth = Depends(current_api_key)):
    u = month_usage_for_key(auth.key_id)
    return UsageOut(
        requests=u["requests"],
        minutes_metered=u["minutes_metered"],
        month_start=u["month_start"],
        monthly_minutes_limit=auth.monthly_minutes_limit,
        rate_limit_per_min=auth.rate_limit_per_min,
    )
