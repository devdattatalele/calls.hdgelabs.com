# calls.hdgelabs.com — backend

FastAPI service that powers `api.calls.hdgelabs.com`. Three auth modes:

| Auth | Used by | Endpoints |
|---|---|---|
| Supabase JWT (developer) | Dashboard `/settings/*`, `/team`, onboarding | `/v1/dashboard/*`, `/v1/team/*`, `/v1/keys/*` |
| Supabase JWT (team member) | Android app | `/v1/app/*` |
| Per-company API key | B2B partners | `/v1/profile`, `/v1/devices`, `/v1/calls*`, `/v1/usage` |

Public docs (Markdown): `../docs/API.md`. Auto-generated OpenAPI: `/docs` in dev.

## Local dev

```bash
cp .env.example .env
# Fill in Supabase URL, anon key, service role key, and JWT secret
docker compose -f compose.dev.yml up --build
# Backend on http://localhost:8000, Redis on :6379
```

The dev compose file mounts `./app` into the container so reloads are instant.
For a true hot-reload, run `uvicorn app.main:app --reload --port 8000` outside
Docker.

## Layout

```
app/
├── main.py              FastAPI app, CORS, router includes
├── core/
│   ├── config.py        pydantic-settings, env loading
│   ├── supabase_client.py   service-role client singleton
│   ├── redis_client.py
│   ├── security.py      JWT + API-key auth dependencies
│   ├── rate_limit.py    sliding-window Redis counter
│   └── usage.py         monthly quota + usage rollup
├── api/
│   ├── dashboard.py     POST /v1/dashboard/onboard
│   ├── team.py          team-member CRUD via Supabase admin API
│   ├── keys.py          mint / revoke API keys
│   ├── app_endpoints.py /v1/app/me, /v1/app/uploads/sign
│   ├── b2b_calls.py     /v1/calls* + /v1/devices
│   └── b2b_profile.py   /v1/profile, /v1/usage
└── models/
    └── schemas.py       pydantic request/response models
```

## Deploy

See `../infra/README.md`. TL;DR: paste two snippets into hdgebot's compose +
Caddy, then `docker compose up -d --build calls-api calls-redis`.
