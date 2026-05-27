# Droplet deployment

The `calls-api` backend shares the same Digital Ocean droplet as `hdgebot`. We
add two services to hdgebot's compose file and one block to its Caddyfile —
nothing existing is modified.

## One-time setup on the droplet

1. **DNS**: add an A record for `api.calls.hdgelabs.com` pointing to the droplet
   IP. (The dashboard frontend `calls.hdgelabs.com` itself goes to Vercel via a
   CNAME — that's separate.)

2. **Clone this repo** next to `hdgebot`:
   ```
   cd /opt
   git clone <repo-url> calls.hdgelabs.com
   ```

3. **Create the prod env file**:
   ```
   cp /opt/calls.hdgelabs.com/api/.env.example /opt/calls.hdgelabs.com/api/.env.prod
   $EDITOR /opt/calls.hdgelabs.com/api/.env.prod
   ```
   Required values: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_JWT_SECRET`. Set `CORS_ORIGINS=https://calls.hdgelabs.com`.

4. **Apply the migration** to the HDGEcalls Supabase project via Studio:
   `supabase/migrations/0004_teams_and_api.sql`.

5. **Patch hdgebot's compose + Caddy**:
   - Paste `infra/compose-snippet.yml` into `hdgebot/docker-compose.prod.yml`
   - Paste `infra/caddy-snippet.txt` into `hdgebot/Caddyfile`

6. **Bring up the new services** without disturbing existing ones:
   ```
   cd /opt/hdgebot
   docker compose -f docker-compose.prod.yml up -d --build calls-api calls-redis
   docker compose -f docker-compose.prod.yml restart caddy
   ```

7. **Verify**:
   ```
   curl https://api.calls.hdgelabs.com/v1/health        # → {"ok": true}
   curl https://api.hdgelabs.com/health                  # hdgebot still up
   ```

## On every deploy

`git pull` inside `/opt/calls.hdgelabs.com`, then:
```
cd /opt/hdgebot
docker compose -f docker-compose.prod.yml up -d --build calls-api
```

Reload Caddy only if you change `infra/caddy-snippet.txt`.
