# Cloudflare Tunnel — transcribe.calls.hdgelabs.com

The dashboard shows a **"Transcriber online"** pill (top-right of Recordings
and Transcripts pages). That pill is the website's only signal that the local
Whisper worker on the user's Mac is reachable. Transcription itself is
**pull-based** — the worker polls Supabase directly — so a tunnel outage does
not stop transcription, it only hides the pill.

This doc sets up the tunnel from scratch.

## What we're wiring

```
[Browser]
   │
   ▼
[Vercel] calls.hdgelabs.com (web)
   │ fetch /v1/dashboard/transcribe/health (Bearer JWT)
   ▼
[FastAPI on droplet] api.calls.hdgelabs.com
   │ httpx.get(https://transcribe.calls.hdgelabs.com/status)
   ▼
[Cloudflare]
   │ cloudflared tunnel
   ▼
[User's Mac] http://localhost:7777  (Node http server in tools/local-transcriber)
```

The FastAPI side already proxies the worker's `/status` and caches the result
for 10 s — defined in `api/app/api/transcription.py`. The bit we configure
here is the right-hand `Cloudflare → Mac` leg.

## One-time setup (do on the Mac that runs the worker)

```bash
brew install cloudflared

# 1. Authenticate cloudflared with your Cloudflare account. Opens a browser;
#    pick the `hdgelabs.com` zone.
cloudflared tunnel login

# 2. Create the named tunnel. This writes a credentials JSON to
#    ~/.cloudflared/<UUID>.json — keep it; we reference it below.
cloudflared tunnel create hdge-transcriber

# 3. Route a DNS name to the tunnel. This creates a CNAME on
#    transcribe.calls.hdgelabs.com pointing at <UUID>.cfargotunnel.com.
cloudflared tunnel route dns hdge-transcriber transcribe.calls.hdgelabs.com
```

## Tunnel config

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: hdge-transcriber
credentials-file: /Users/<you>/.cloudflared/<UUID>.json

ingress:
  - hostname: transcribe.calls.hdgelabs.com
    service: http://localhost:7777
  - service: http_status:404
```

(Replace `<you>` and `<UUID>` with the actual paths `cloudflared tunnel create`
printed.)

## Verify

In one terminal, start the worker:

```bash
cd "/Users/dev16/Documents/calling/HDGEcalls app/tools/local-transcriber"
npm start
# expect: [transcriber] health server on :7777
```

In a second terminal, run the tunnel in the foreground:

```bash
cloudflared tunnel run hdge-transcriber
# expect: Registered tunnel connection ...
```

From any other network (phone hotspot is easiest):

```bash
curl -s https://transcribe.calls.hdgelabs.com/health
# {"ok":true,"provider":"whisper.cpp:ggml-large-v3-turbo-q5_0",...}
```

Reload the dashboard `/recordings` page — the pill should turn green.

## Run on boot (launchd)

The transcriber repo ships a sample plist:

```bash
cp "/Users/dev16/Documents/calling/HDGEcalls app/tools/local-transcriber/launchd/com.hdgelabs.cloudflared.plist" \
   ~/Library/LaunchAgents/

launchctl load -w ~/Library/LaunchAgents/com.hdgelabs.cloudflared.plist
# logs: /tmp/hdgecalls-cloudflared.log
```

The plist invokes `cloudflared tunnel run hdge-transcriber`; the tunnel name
must match the one you created above.

## Env vars the API uses

These are optional; defaults are sensible. Set in the FastAPI `.env` if you
change the URL:

```
TRANSCRIBER_HEALTH_URL=https://transcribe.calls.hdgelabs.com/status
TRANSCRIBER_HEALTH_TIMEOUT_SEC=2.0
TRANSCRIBER_HEALTH_CACHE_SEC=10
```

## Tearing it down

```bash
launchctl unload ~/Library/LaunchAgents/com.hdgelabs.cloudflared.plist
cloudflared tunnel route dns --overwrite-dns hdge-transcriber transcribe.calls.hdgelabs.com  # only if migrating
cloudflared tunnel delete hdge-transcriber
```
