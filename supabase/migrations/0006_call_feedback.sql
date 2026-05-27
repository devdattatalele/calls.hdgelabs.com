-- 0006_call_feedback.sql
-- Mirrors HDGEcalls app/supabase/migrations/0005_call_feedback.sql so the
-- dashboard repo has the schema reference. Applied to the same Supabase
-- project — safe to re-run.

alter table public.calls
  add column if not exists rating int
    check (rating is null or (rating between 1 and 10)),
  add column if not exists purchase_confidence int
    check (purchase_confidence is null or (purchase_confidence between 1 and 10)),
  add column if not exists assigned_contact_name text,
  add column if not exists assigned_contact_phone text,
  add column if not exists rated_at timestamptz;

create index if not exists calls_rated_at_idx
  on public.calls (company_id, rated_at desc)
  where rated_at is not null;
