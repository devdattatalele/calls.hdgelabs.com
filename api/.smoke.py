"""End-to-end smoke test. Uses service-role + manually-signed JWT to drive the
backend exactly the way the dashboard would. Not committed."""

import os
import sys
import time
import json
import urllib.request
import urllib.error

import jwt
from dotenv import load_dotenv
from supabase import create_client


load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
API = "http://localhost:8000"


def h(s):
    print(f"\n=== {s} ===")


def http(method, path, *, headers=None, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    hdrs = {"Accept": "application/json"}
    if body is not None:
        hdrs["Content-Type"] = "application/json"
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            text = r.read().decode()
            return r.status, text
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def sign_developer_jwt(user_id, email):
    payload = {
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "sub": user_id,
        "email": email,
        "role": "authenticated",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


db = create_client(SUPABASE_URL, SERVICE_ROLE)

h("health")
print(http("GET", "/v1/health"))

h("verify migration: list new tables")
for t in ("companies", "company_members", "api_keys", "api_usage", "excluded_numbers"):
    try:
        r = db.table(t).select("*", count="exact", head=True).execute()
        print(f"  {t:24} OK count={r.count}")
    except Exception as e:
        print(f"  {t:24} MISSING ({e})")
        sys.exit(1)

h("find a developer (company owner) to impersonate")
companies = db.table("companies").select("*").limit(1).execute().data
if not companies:
    print("  no company rows yet — finish /onboard in the dashboard first")
    sys.exit(0)
company = companies[0]
dev_id = company["owner_user_id"]
user = db.auth.admin.get_user_by_id(dev_id).user
dev_email = user.email
print(f"  company: {company['name']} (id={company['id']})")
print(f"  owner:   {dev_email} (id={dev_id})")

dev_jwt = sign_developer_jwt(dev_id, dev_email)

h("mint an API key as the developer (low rate-limit so we can demo 429)")
status, body = http("POST", "/v1/keys",
                    headers={"Authorization": f"Bearer {dev_jwt}"},
                    body={"name": "smoke-test", "rate_limit_per_min": 5, "monthly_minutes_limit": 1000})
print(f"  HTTP {status}")
print(f"  body: {body}")
if status != 200:
    sys.exit(1)
mint = json.loads(body)
api_key = mint["key"]
key_id = mint["id"]
prefix = mint["prefix"]
print(f"  minted prefix={prefix}")

# B2B
hdrs = {"Authorization": f"Bearer {api_key}"}

h("GET /v1/profile (B2B)")
print(http("GET", "/v1/profile", headers=hdrs))

h("GET /v1/devices (B2B)")
print(http("GET", "/v1/devices", headers=hdrs))

h("GET /v1/calls (B2B)")
print(http("GET", "/v1/calls?limit=3", headers=hdrs))

h("GET /v1/usage (B2B)")
print(http("GET", "/v1/usage", headers=hdrs))

h("rate-limit: 15 quick requests at rate=5/min, expect 429 starting at #6")
sc_count = {}
for i in range(15):
    s, _ = http("GET", "/v1/profile", headers=hdrs)
    sc_count[s] = sc_count.get(s, 0) + 1
print(f"  status codes: {sc_count}")  # expect {200: 5, 429: 10}

h("revoke the key, expect 401 next call")
db.table("api_keys").update({"revoked_at": "now()"}).eq("id", key_id).execute()
print(http("GET", "/v1/profile", headers=hdrs))

h("cleanup smoke key")
db.table("api_keys").delete().eq("id", key_id).execute()

h("team-member create: simulate the dashboard call")
import string, random
testmail = f"smoke+{''.join(random.choices(string.ascii_lowercase, k=6))}@hdgetest.invalid"
status, body = http(
    "POST", "/v1/team/members",
    headers={"Authorization": f"Bearer {dev_jwt}"},
    body={"email": testmail, "password": "test-12345", "label": "Smoke test member"},
)
print(f"  HTTP {status}")
print(f"  body: {body}")
if status == 200:
    new_uid = json.loads(body)["user_id"]
    # Verify membership row exists
    m = db.table("company_members").select("*").eq("user_id", new_uid).execute().data
    print(f"  member row: {m}")
    # Cleanup
    db.table("company_members").delete().eq("user_id", new_uid).execute()
    db.auth.admin.delete_user(new_uid)
    print("  cleaned up test member")
print("\nALL DONE.")
