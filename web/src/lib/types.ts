// Mirror of HDGEcalls app/src/supabase/client.ts row types, extended with the
// company/team additions from migration 0004. Keep in sync by hand for now.

export type CallDirection = "incoming" | "outgoing" | "missed" | "rejected";

export type TranscriptionStatus =
  | "pending"
  | "processing"
  | "done"
  | "failed"
  | "skipped";

export interface ProfileRow {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface DeviceRow {
  id: string;
  user_id: string;
  company_id: string | null;
  android_id: string;
  label: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface CallRow {
  id: string;
  user_id: string;
  device_id: string;
  company_id: string | null;
  phone_number: string | null;
  contact_name: string | null;
  direction: CallDirection | null;
  started_at: string;
  duration_sec: number;
  call_log_id: string | null;
  recording_storage_path: string | null;
  recording_mime: string | null;
  recording_source: "auto" | "manual_share" | null;
  transcription_status: TranscriptionStatus;
  transcript: string | null;
  transcript_segments: TranscriptSegment[] | null;
  transcript_provider: string | null;
  // Sales feedback (added by HDGEcalls app/0005_call_feedback)
  rating: number | null;
  purchase_confidence: number | null;
  assigned_contact_name: string | null;
  assigned_contact_phone: string | null;
  rated_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Bucket the 1-10 purchase_confidence into one of three labels. */
export type ConfidenceBucket = "sure" | "mid" | "not_sure";

export function confidenceBucket(c: number | null | undefined): ConfidenceBucket | null {
  if (c == null) return null;
  if (c >= 7) return "sure";
  if (c >= 4) return "mid";
  return "not_sure";
}

export function confidenceLabel(b: ConfidenceBucket | null): string {
  if (b === "sure") return "Sure";
  if (b === "mid") return "Mid";
  if (b === "not_sure") return "Not sure";
  return "—";
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string | number;
  confidence?: number;
}

export interface CompanyRow {
  id: string;
  owner_user_id: string;
  name: string;
  logo_url: string | null;
  role: string | null;
  size: string | null;
  website: string | null;
  industry: string | null;
  plan: "free" | "starter" | "pro" | "business" | string;
  monthly_recording_limit: number;
  monthly_token_limit: number;
  created_at: string;
}

export interface CompanyMemberRow {
  company_id: string;
  user_id: string;
  label: string | null;
  invited_email: string;
  deactivated_at: string | null;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  company_id: string;
  name: string;
  prefix: string;
  rate_limit_per_min: number;
  monthly_minutes_limit: number;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface ExcludedNumberRow {
  company_id: string;
  phone_number: string;
  reason: string | null;
  created_at: string;
}
