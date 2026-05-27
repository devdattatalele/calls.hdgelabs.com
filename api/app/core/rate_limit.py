"""Sliding-window rate limit, 60 second window, per api_key_id.

Uses a sorted set in Redis where the score is the request timestamp.
"""

from __future__ import annotations

import time
import uuid

from fastapi import HTTPException

from app.core.redis_client import get_redis


WINDOW_SECONDS = 60


async def enforce_rate_limit(auth) -> None:  # auth: ApiKeyAuth
    r = get_redis()
    key = f"rl:{auth.key_id}"
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, cutoff)
    pipe.zadd(key, {f"{now}:{uuid.uuid4().hex}": now})
    pipe.zcard(key)
    pipe.expire(key, WINDOW_SECONDS + 5)
    _, _, count, _ = pipe.execute()

    if count > auth.rate_limit_per_min:
        retry = int(WINDOW_SECONDS - (now - cutoff))
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit of {auth.rate_limit_per_min} req/min exceeded",
            headers={"Retry-After": str(max(retry, 1))},
        )
