from functools import lru_cache
import redis
from app.core.config import get_settings


@lru_cache
def get_redis() -> redis.Redis:
    s = get_settings()
    return redis.Redis.from_url(s.redis_url, decode_responses=True)
