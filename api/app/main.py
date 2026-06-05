from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    app_endpoints,
    b2b_calls,
    b2b_profile,
    billing,
    dashboard,
    keys,
    recordings,
    team,
    test_upload,
    transcription,
)
from app.core.config import get_settings


settings = get_settings()

app = FastAPI(
    title="HDGE Calls API",
    description=(
        "Backend for calls.hdgelabs.com. Three flavors of auth:\n"
        "- Dashboard endpoints: Supabase JWT of the developer (company owner)\n"
        "- App endpoints: Supabase JWT of a team member\n"
        "- B2B endpoints: per-company API key in the Authorization header\n"
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/v1/health")
def health():
    return {"ok": True}


app.include_router(dashboard.router)
app.include_router(recordings.router)
app.include_router(transcription.router)
app.include_router(test_upload.router)
app.include_router(team.router)
app.include_router(keys.router)
app.include_router(billing.router)
app.include_router(app_endpoints.router)
app.include_router(b2b_calls.router)
app.include_router(b2b_profile.router)
