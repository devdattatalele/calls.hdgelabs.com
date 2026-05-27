# HDGE Calls API

Two surfaces:

1. **Public B2B export API** — partners pull your calls, recordings, and
   transcripts via REST. Authed with a per-company API key.
2. **App integration contract** — what the HDGEcalls Android app talks to.

Base URL: `https://api.calls.hdgelabs.com`

---

## Authentication

### B2B (`/v1/profile`, `/v1/devices`, `/v1/calls*`, `/v1/usage`)

Send the API key in the `Authorization` header:

```
Authorization: Bearer hdg_<8chars>_<48chars>
```

The dashboard owner mints these in **Settings → API keys**. The plaintext
secret is shown **once** at creation — copy it then. Keys have a per-minute
rate limit and a monthly minutes quota.

### App (`/v1/app/*`)

Send the team member's **Supabase access token** (from
`supabase.auth.signInWithPassword`) as `Authorization: Bearer <jwt>`.

### Dashboard (`/v1/dashboard/*`, `/v1/team/*`, `/v1/keys/*`)

Same as App, but the JWT must belong to the company **owner** (developer) —
i.e. there exists a `companies` row with `owner_user_id = jwt.sub`.

---

## B2B endpoints

### `GET /v1/health`

Liveness probe (no auth).
```json
{ "ok": true }
```

### `GET /v1/profile`

Returns the company profile, plan, and monthly limits.

### `GET /v1/devices`

List of devices registered to your company.

### `GET /v1/calls`

Paginated list of calls. Filters (all optional):

| Param | Type | Notes |
|---|---|---|
| `from` | ISO timestamp | inclusive lower bound on `started_at` |
| `to` | ISO timestamp | inclusive upper bound |
| `direction` | `incoming\|outgoing\|missed\|rejected` | |
| `device_id` | uuid | |
| `team_member_id` | uuid | the phone user's `auth.users.id` |
| `number` | string | substring match (ILIKE) on `phone_number` |
| `has_recording` | bool | only calls with an attached audio file |
| `has_transcript` | bool | only calls where `transcription_status = done` |
| `limit` | int | 1..200, default 50 |
| `cursor` | string | from previous response's `next_cursor` |

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "started_at": "2026-05-27T12:30:00Z",
      "duration_sec": 184,
      "direction": "outgoing",
      "phone_number": "+919800000000",
      "contact_name": null,
      "device_id": "uuid",
      "team_member_id": "uuid",
      "has_recording": true,
      "transcription_status": "done"
    }
  ],
  "next_cursor": "2026-05-27T12:30:00Z|uuid"
}
```

### `GET /v1/calls/{id}`

Single call with full transcript fields.

### `GET /v1/calls/{id}/recording`

302 redirect to a short-lived signed URL (5 min TTL) on Supabase Storage.

**Meters the request**: increments your monthly `minutes_metered` by
`duration_sec / 60`. When you hit `monthly_minutes_limit`, this endpoint
returns `402 Payment Required`.

### `GET /v1/calls/{id}/transcript`

```json
{
  "call_id": "uuid",
  "transcript": "Hello, this is ...",
  "segments": [
    { "start": 0.0, "end": 2.4, "text": "Hello, this is", "speaker": 0 }
  ],
  "provider": "deepgram"
}
```
Returns `409` if the transcript is not yet `done`.

### `GET /v1/usage`

Your key's current month-to-date usage:
```json
{
  "requests": 1342,
  "minutes_metered": 412.5,
  "month_start": "2026-05-01",
  "monthly_minutes_limit": 1000,
  "rate_limit_per_min": 60
}
```

---

## Errors

| Status | Meaning |
|---|---|
| `401` | Missing / invalid / revoked API key |
| `402` | Monthly minutes quota reached |
| `404` | Call/device not found in your company |
| `409` | Transcript not yet ready |
| `429` | Per-minute rate limit exceeded (header `Retry-After` present) |

---

## App integration contract (Android: `HDGEcalls`)

The Android app talks to **both** Supabase (directly) and this backend.

### 1. Login

Team-member credentials are provisioned by the developer in the dashboard.
The app does **not** offer signup; only sign in.

```ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
```

If `error.message === "Invalid login credentials"` *and* the user previously
signed in, treat it as "deactivated" and surface a clear "Access has been
revoked" screen.

### 2. Bootstrap company branding

Immediately after a successful login, call:

```
GET /v1/app/me
Authorization: Bearer <supabase access_token>
```

Response:
```json
{
  "user_id": "uuid",
  "email": "agent@acme.com",
  "member_label": "Field rep — Mumbai",
  "company": {
    "id": "uuid",
    "name": "Acme Co",
    "logo_url": "https://...company-assets/{company_id}/logo.png?v=...",
    "plan": "pro",
    "monthly_recording_limit": 500,
    "monthly_token_limit": 600000
  }
}
```

Cache `company.name` and `company.logo_url` in app state; show them in the
top bar of the HDGEcalls UI.

### 3. Upload a recording

Before each recording upload, ask the backend to mint a presigned URL:

```
POST /v1/app/uploads/sign
Authorization: Bearer <supabase access_token>
Content-Type: application/json

{
  "call_id": "uuid (the call row id you're about to insert)",
  "phone_number": "+919800000000",
  "started_at": "2026-05-27T12:30:00Z",
  "ext": "m4a"
}
```

Response:
```json
{
  "url": "https://<project>.supabase.co/storage/v1/object/upload/sign/...",
  "token": "...",
  "recording_storage_path": "{user_id}/by-number/+919800000000/2026-05-27/123000_abcdef12.m4a",
  "company_id": "uuid",
  "expires_in": 300
}
```

`PUT` your audio file to `url`. Then insert the `calls` row with that
`recording_storage_path` — RLS plus the `calls_set_company_id` trigger will
take care of stamping `company_id` automatically.

### 4. Transcripts

Transcription runs as today (Supabase Edge Function on upload). The app does
not need to do anything else for transcripts — the dashboard will fetch them.

---

## Quick `curl` recipe

```bash
KEY=hdg_abcdef12_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Health
curl https://api.calls.hdgelabs.com/v1/health

# Recent calls
curl -H "Authorization: Bearer $KEY" \
  'https://api.calls.hdgelabs.com/v1/calls?limit=10&has_recording=true'

# Download a recording (follow redirect)
curl -L -H "Authorization: Bearer $KEY" \
  https://api.calls.hdgelabs.com/v1/calls/$CALL_ID/recording -o call.m4a

# Usage
curl -H "Authorization: Bearer $KEY" https://api.calls.hdgelabs.com/v1/usage
```
