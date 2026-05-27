from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    redis_url: str = "redis://calls-redis:6379/0"
    cors_origins: str = "http://localhost:5173"

    recordings_bucket: str = "call-recordings"

    # Billing (Polar)
    billing_mode: str = "mock"  # "mock" or "live"
    polar_access_token: str = ""
    polar_webhook_secret: str = ""
    polar_product_starter: str = ""
    polar_product_growth: str = ""
    polar_product_business: str = ""
    dashboard_url: str = "http://localhost:5173"

    log_level: str = "info"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
