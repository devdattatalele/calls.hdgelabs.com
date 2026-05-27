"""Three auth dependencies:

1. current_developer  — verifies a Supabase JWT and resolves the user's company.
2. current_team_member — verifies a Supabase JWT and resolves their company_members row.
3. current_api_key    — looks up + bcrypt-verifies an api_keys row, applies
                        rate-limit + monthly-quota checks.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Optional

import bcrypt
import jwt
from jwt import PyJWKClient
from fastapi import Depends, Header, HTTPException, Request, status

from app.core.config import get_settings
from app.core.supabase_client import supabase_admin


_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        s = get_settings()
        url = f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(url, cache_keys=True, lifespan=3600)
    return _jwks_client


_SESSION_EXPIRED_HINTS = (
    "session from session_id claim",
    "session_not_found",
    "session does not exist",
    "user not found",
    "jwt expired",
)


def _is_session_expired(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(h in msg for h in _SESSION_EXPIRED_HINTS)


def _decode_supabase_jwt(token: str) -> dict:
    """Verify a Supabase access token.

    Order of attempts:
      1. Local HS256 with the project JWT secret (legacy projects).
      2. Local asymmetric verification using the project's JWKS (newer projects).
      3. Remote verification via `/auth/v1/user` (last resort).

    A session that was signed out server-side returns 401 detail='session_expired'
    so the frontend can sign the user out automatically.
    """
    s = get_settings()

    # 1. HS256 with project secret
    try:
        return jwt.decode(
            token,
            s.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="session_expired") from None
    except (jwt.InvalidAlgorithmError, jwt.InvalidSignatureError):
        pass  # token is asymmetric — try JWKS
    except jwt.PyJWTError:
        pass

    # 2. JWKS-based asymmetric verification
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "EdDSA"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="session_expired") from None
    except Exception:
        pass

    # 3. Ask Supabase to verify (last resort)
    try:
        res = supabase_admin().auth.get_user(token)
    except Exception as exc:
        if _is_session_expired(exc):
            raise HTTPException(status_code=401, detail="session_expired") from exc
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc

    user = getattr(res, "user", None) or (res.get("user") if isinstance(res, dict) else None)
    if not user:
        raise HTTPException(status_code=401, detail="session_expired")
    user_id = getattr(user, "id", None) or user.get("id")
    email = getattr(user, "email", None) or user.get("email")
    if not user_id:
        raise HTTPException(status_code=401, detail="session_expired")
    return {"sub": user_id, "email": email, "aud": "authenticated"}


def _bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


@dataclass
class Developer:
    user_id: str
    email: Optional[str]
    company_id: str
    company: dict


def current_developer(authorization: Optional[str] = Header(None)) -> Developer:
    token = _bearer(authorization)
    claims = _decode_supabase_jwt(token)
    user_id = claims["sub"]
    email = claims.get("email")
    db = supabase_admin()
    res = (
        db.table("companies")
        .select("*")
        .eq("owner_user_id", user_id)
        .maybe_single()
        .execute()
    )
    company = res.data if res else None
    if not company:
        raise HTTPException(status_code=403, detail="No company workspace for this user")
    return Developer(user_id=user_id, email=email, company_id=company["id"], company=company)


@dataclass
class TeamMember:
    user_id: str
    email: Optional[str]
    company_id: str
    label: Optional[str]


def current_team_member(authorization: Optional[str] = Header(None)) -> TeamMember:
    token = _bearer(authorization)
    claims = _decode_supabase_jwt(token)
    user_id = claims["sub"]
    email = claims.get("email")
    db = supabase_admin()
    res = (
        db.table("company_members")
        .select("*")
        .eq("user_id", user_id)
        .is_("deactivated_at", "null")
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=403, detail="No active company membership")
    m = rows[0]
    return TeamMember(
        user_id=user_id, email=email, company_id=m["company_id"], label=m.get("label")
    )


# ----------------------------- API key auth -----------------------------------

API_KEY_PREFIX = "hdg_"
API_KEY_PREFIX_LEN = 12  # `hdg_` + 8 chars


_SEPARATOR = "."  # token_urlsafe never produces '.', so it's a safe delimiter


def generate_api_key() -> tuple[str, str, str]:
    """Returns (full_plaintext_key, prefix_for_lookup, bcrypt_hash_of_secret).

    Format: hdg_<8 url-safe chars>.<48 url-safe chars>
    Prefix stored plaintext for fast lookup; secret part bcrypt-hashed.
    """
    visible = secrets.token_urlsafe(6)[:8]
    secret = secrets.token_urlsafe(36)[:48]
    prefix = f"{API_KEY_PREFIX}{visible}"
    plaintext = f"{prefix}{_SEPARATOR}{secret}"
    key_hash = bcrypt.hashpw(secret.encode(), bcrypt.gensalt(rounds=10)).decode()
    return plaintext, prefix, key_hash


def split_api_key(plaintext: str) -> tuple[str, str]:
    """Returns (prefix, secret). Raises if malformed."""
    if not plaintext.startswith(API_KEY_PREFIX) or _SEPARATOR not in plaintext:
        raise HTTPException(status_code=401, detail="Invalid API key")
    prefix, secret = plaintext.rsplit(_SEPARATOR, 1)
    if not prefix.startswith(API_KEY_PREFIX) or not secret:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return prefix, secret


@dataclass
class ApiKeyAuth:
    key_id: str
    company_id: str
    prefix: str
    rate_limit_per_min: int
    monthly_minutes_limit: int


async def current_api_key(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> ApiKeyAuth:
    from app.core.rate_limit import enforce_rate_limit  # late import: cycle
    from app.core.usage import enforce_monthly_quota, increment_request

    token = _bearer(authorization)
    prefix, secret = split_api_key(token)
    db = supabase_admin()
    res = db.table("api_keys").select("*").eq("prefix", prefix).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=401, detail="Unknown API key")
    row = rows[0]
    if row.get("revoked_at"):
        raise HTTPException(status_code=401, detail="API key revoked")
    if not bcrypt.checkpw(secret.encode(), row["key_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid API key")

    auth = ApiKeyAuth(
        key_id=row["id"],
        company_id=row["company_id"],
        prefix=row["prefix"],
        rate_limit_per_min=row["rate_limit_per_min"],
        monthly_minutes_limit=row["monthly_minutes_limit"],
    )

    await enforce_rate_limit(auth)
    enforce_monthly_quota(auth)
    increment_request(auth)
    request.state.api_key = auth

    # touch last_used_at (best-effort)
    db.table("api_keys").update({"last_used_at": "now()"}).eq("id", auth.key_id).execute()
    return auth
