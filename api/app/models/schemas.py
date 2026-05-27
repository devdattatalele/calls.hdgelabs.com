from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- dashboard ----------


class OnboardRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None


class CompanyOut(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None
    role: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    plan: str
    monthly_recording_limit: int
    monthly_token_limit: int


# ---------- team ----------


class CreateMemberRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    label: Optional[str] = None


class CreateMemberResponse(BaseModel):
    user_id: str


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


# ---------- api keys ----------


class MintKeyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    rate_limit_per_min: int = 60
    monthly_minutes_limit: int = 1000


class MintKeyResponse(BaseModel):
    id: str
    prefix: str
    key: str  # plaintext, shown once


# ---------- app (team-member) ----------


class AppMeResponse(BaseModel):
    user_id: str
    email: Optional[str]
    member_label: Optional[str]
    company: CompanyOut


class UploadSignRequest(BaseModel):
    call_id: str
    phone_number: Optional[str] = None
    started_at: str  # ISO timestamp
    ext: str = "m4a"


class UploadSignResponse(BaseModel):
    url: str
    token: Optional[str] = None
    recording_storage_path: str
    company_id: str
    expires_in: int


# ---------- B2B export ----------


class CallOut(BaseModel):
    id: str
    started_at: str
    duration_sec: int
    direction: Optional[str]
    phone_number: Optional[str]
    contact_name: Optional[str]
    device_id: str
    team_member_id: str
    has_recording: bool
    transcription_status: str
    # Sales feedback (added by HDGEcalls app)
    rating: Optional[int] = None
    purchase_confidence: Optional[int] = None
    confidence_note: Optional[str] = None  # "sure" | "mid" | "not_sure"
    assigned_contact_name: Optional[str] = None
    assigned_contact_phone: Optional[str] = None
    rated_at: Optional[str] = None


class CallDetailOut(CallOut):
    transcript: Optional[str]
    transcript_segments: Optional[list[dict[str, Any]]]
    transcript_provider: Optional[str]


class CallListResponse(BaseModel):
    items: list[CallOut]
    next_cursor: Optional[str] = None


class TranscriptOut(BaseModel):
    call_id: str
    transcript: Optional[str]
    segments: Optional[list[dict[str, Any]]]
    provider: Optional[str]


class UsageOut(BaseModel):
    requests: int
    minutes_metered: float
    month_start: str
    monthly_minutes_limit: int
    rate_limit_per_min: int


class DeviceOut(BaseModel):
    id: str
    label: Optional[str]
    android_id: str
    last_synced_at: Optional[str]
    team_member_id: str
