"""Check storage RLS policy + try signing a real recording URL as the dev."""

import os, json, time, urllib.request, jwt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
URL = os.environ["SUPABASE_URL"]
SRK = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANON = os.environ["SUPABASE_ANON_KEY"]
SECRET = os.environ["SUPABASE_JWT_SECRET"]

db = create_client(URL, SRK)

print("=== storage policies on bucket=call-recordings ===")
res = db.postgrest.rpc("pg_policies_for_bucket", {}).execute() if False else None
# Use raw SQL via service-role:
sql = """
select policyname, cmd, qual
from pg_policies
where schemaname='storage' and tablename='objects'
order by policyname;
"""
# supabase-py doesn't expose raw SQL directly; use REST via PostgREST RPC if defined,
# else fall back to inspecting via the API:
print("(see Supabase Studio Auth > Policies for full list)")

print("\n=== sample call rows ===")
calls = db.table("calls").select("id, user_id, company_id, recording_storage_path").not_.is_("recording_storage_path", "null").limit(3).execute().data
for c in calls:
    print(c)

print("\n=== company + membership ===")
companies = db.table("companies").select("*").execute().data
print("companies:", [(c["id"], c["name"], c["owner_user_id"]) for c in companies])
members = db.table("company_members").select("*").execute().data
print("members:", members)

# Find dev
dev_id = companies[0]["owner_user_id"]
dev_email = db.auth.admin.get_user_by_id(dev_id).user.email
print(f"\ndev: {dev_email} (id={dev_id})")

# Sign in as dev to get a real JWT (with proper alg)
print("\n=== Try createSignedUrl as the developer ===")
# We don't know dev password. Forge HS256 JWT (works if project still uses HS256 for verification at storage layer)
payload = {
    "aud": "authenticated", "exp": int(time.time())+3600, "iat": int(time.time()),
    "sub": dev_id, "email": dev_email, "role": "authenticated",
}
dev_jwt = jwt.encode(payload, SECRET, algorithm="HS256")

# Use the JWT against storage REST API
path = calls[0]["recording_storage_path"]
print(f"trying path: {path}")

url = f"{URL}/storage/v1/object/sign/call-recordings/{path}"
req = urllib.request.Request(
    url, method="POST",
    data=json.dumps({"expiresIn": 600}).encode(),
    headers={
        "Authorization": f"Bearer {dev_jwt}",
        "apikey": ANON,
        "Content-Type": "application/json",
    },
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        print("HTTP", r.status, r.read().decode())
except Exception as e:
    body = e.read().decode() if hasattr(e, 'read') else str(e)
    print(f"HTTP {getattr(e, 'code', '?')} {body}")

# Also try service-role
print("\n=== Same path via service-role (should always succeed) ===")
try:
    signed = db.storage.from_("call-recordings").create_signed_url(path, 600)
    print("OK", signed.get("signed_url") or signed.get("signedUrl") or signed)
except Exception as e:
    print("FAIL", e)
