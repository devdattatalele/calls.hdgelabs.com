# calls.hdgelabs.com

B2B call-recording dashboard for HDGEcalls. A developer signs up, fills in
company details, provisions phone-user accounts, and views all their team's
calls + transcripts. A public REST API at `api.calls.hdgelabs.com` exposes the
same data to third parties under per-company API keys, rate-limited and metered
by the minute.

## Layout

| Path | What it is |
|---|---|
| `web/` | Vite + React + TS + Tailwind + shadcn dashboard (Vercel) |
| `api/` | FastAPI service for admin ops, app endpoints, and B2B export (DO droplet) |
| `supabase/migrations/` | SQL migrations applied to the existing HDGEcalls Supabase project |
| `infra/` | Snippets to paste into the sibling `hdgebot/` repo's `Caddyfile` and `docker-compose.prod.yml` so the same droplet hosts both backends |
| `docs/API.md` | Public API reference + Android-app integration contract |

## How the pieces connect

```
Browser ──▶ Vercel (web/)  ──▶ Supabase (HDGEcalls project)  ◀── Android app (HDGEcalls)
                ▲                       ▲
                └───────────────────────┴── Droplet (api/) ◀── B2B partners
```

- **Dashboard** signs in with Supabase Auth; reads/writes Supabase directly under RLS.
- **Backend (`api/`)** handles only privileged ops: minting team-member auth users, presigning recording uploads for phones, and exposing the metered REST API.
- **Android app** uses the same Supabase Auth, with creds the developer issues from the dashboard.

## Local dev

```bash
# Frontend
cd web && npm install && npm run dev

# Backend
cd api && docker compose -f compose.dev.yml up --build
```

## Deploy

- Frontend: push to GitHub, import `web/` as a Vercel project, set `VITE_*` env vars.
- Backend: paste `infra/compose-snippet.yml` into hdgebot's `docker-compose.prod.yml` and `infra/caddy-snippet.txt` into hdgebot's `Caddyfile`, then `docker compose up -d --build calls-api calls-redis caddy` on the droplet.

See `docs/API.md` for the REST API + app contract.
