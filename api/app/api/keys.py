from fastapi import APIRouter, Depends, HTTPException

from app.core.security import Developer, current_developer, generate_api_key
from app.core.supabase_client import supabase_admin
from app.models.schemas import MintKeyRequest, MintKeyResponse


router = APIRouter(prefix="/v1/keys", tags=["keys"])


@router.post("", response_model=MintKeyResponse)
def mint_key(body: MintKeyRequest, dev: Developer = Depends(current_developer)):
    plaintext, prefix, key_hash = generate_api_key()
    db = supabase_admin()
    inserted = (
        db.table("api_keys")
        .insert(
            {
                "company_id": dev.company_id,
                "name": body.name,
                "prefix": prefix,
                "key_hash": key_hash,
                "rate_limit_per_min": body.rate_limit_per_min,
                "monthly_minutes_limit": body.monthly_minutes_limit,
            }
        )
        .execute()
    )
    rows = inserted.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Could not mint key")
    return MintKeyResponse(id=rows[0]["id"], prefix=prefix, key=plaintext)


@router.delete("/{key_id}")
def revoke(key_id: str, dev: Developer = Depends(current_developer)):
    db = supabase_admin()
    res = (
        db.table("api_keys")
        .update({"revoked_at": "now()"})
        .eq("id", key_id)
        .eq("company_id", dev.company_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"ok": True}
