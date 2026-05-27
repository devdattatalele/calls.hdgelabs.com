-- 0004_teams_and_api.sql
-- Adds the team/company tenancy model and the B2B API key system on top of
-- the existing HDGEcalls schema (profiles, devices, calls, transcription_errors,
-- call-recordings storage bucket — see migrations 0001..0003).
--
-- Run against the existing HDGEcalls Supabase project via Studio or
-- `supabase db push`. Safe to re-run; uses `if not exists` and `or replace`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- companies: one workspace per developer (1:1 enforced; schema supports 1:N)
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  logo_url text,
  role text,            -- developer's own role within the company
  size text,
  website text,
  industry text,
  plan text not null default 'free',
  monthly_recording_limit int not null default 50,
  monthly_token_limit int not null default 60000,
  created_at timestamptz not null default now()
);

create unique index if not exists companies_owner_unique
  on public.companies (owner_user_id);

alter table public.companies enable row level security;

drop policy if exists "companies_owner_all" on public.companies;
create policy "companies_owner_all" on public.companies
  for all using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- ---------------------------------------------------------------------------
-- company_members: phone-user memberships. Developer is NOT a member.
-- ---------------------------------------------------------------------------
create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  label text,
  invited_email text not null,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index if not exists company_members_user_idx
  on public.company_members (user_id);

alter table public.company_members enable row level security;

-- Owner can manage all members of their company; members can read their own row.
drop policy if exists "company_members_owner_all" on public.company_members;
create policy "company_members_owner_all" on public.company_members
  for all using (
    exists (
      select 1 from public.companies c
      where c.id = company_members.company_id and c.owner_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.companies c
      where c.id = company_members.company_id and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists "company_members_self_select" on public.company_members;
create policy "company_members_self_select" on public.company_members
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RLS helper used by extended policies below
-- ---------------------------------------------------------------------------
create or replace function public.is_company_owner(c_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.companies
    where id = c_id and owner_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Denormalize company_id onto devices + calls so RLS stays cheap and so the
-- B2B API can filter without an extra join.
-- ---------------------------------------------------------------------------
alter table public.devices
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table public.calls
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists devices_company_idx
  on public.devices (company_id);
create index if not exists calls_company_started_idx
  on public.calls (company_id, started_at desc);

-- Backfill company_id from company_members for any pre-existing rows.
update public.devices d
   set company_id = m.company_id
  from public.company_members m
 where m.user_id = d.user_id and d.company_id is null;

update public.calls c
   set company_id = m.company_id
  from public.company_members m
 where m.user_id = c.user_id and c.company_id is null;

-- Trigger: auto-fill company_id on insert into devices/calls when the inserting
-- user is a team member. Idempotent if the client already provides company_id.
create or replace function public.set_company_id_from_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.company_id is null then
    select m.company_id into new.company_id
      from public.company_members m
     where m.user_id = new.user_id
     limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists devices_set_company_id on public.devices;
create trigger devices_set_company_id
  before insert on public.devices
  for each row execute function public.set_company_id_from_user();

drop trigger if exists calls_set_company_id on public.calls;
create trigger calls_set_company_id
  before insert on public.calls
  for each row execute function public.set_company_id_from_user();

-- Extend RLS: company owner can read/update/delete devices + calls belonging
-- to their company. Existing per-user `*_owner_all` policies still apply to
-- the team member themselves.
drop policy if exists "devices_company_owner_select" on public.devices;
create policy "devices_company_owner_select" on public.devices
  for select using (public.is_company_owner(company_id));

drop policy if exists "devices_company_owner_update" on public.devices;
create policy "devices_company_owner_update" on public.devices
  for update using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

drop policy if exists "calls_company_owner_select" on public.calls;
create policy "calls_company_owner_select" on public.calls
  for select using (public.is_company_owner(company_id));

drop policy if exists "calls_company_owner_update" on public.calls;
create policy "calls_company_owner_update" on public.calls
  for update using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- Storage: extend read access on call-recordings so the company owner can
-- play back any team member's recording (path convention: {user_id}/...).
drop policy if exists "recordings_company_owner_read" on storage.objects;
create policy "recordings_company_owner_read" on storage.objects
  for select using (
    bucket_id = 'call-recordings'
    and exists (
      select 1
        from public.company_members m
        join public.companies c on c.id = m.company_id
       where m.user_id::text = (storage.foldername(name))[1]
         and c.owner_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- my_company: convenience view used by the Android app to fetch its branding.
-- Returns the company row for the currently-authed team member.
-- ---------------------------------------------------------------------------
create or replace view public.my_company
  with (security_invoker = true)
as
  select c.*
    from public.companies c
    join public.company_members m on m.company_id = c.id
   where m.user_id = auth.uid()
     and m.deactivated_at is null;

-- ---------------------------------------------------------------------------
-- api_keys: per-company keys for the B2B export API
-- ---------------------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  prefix text not null unique,         -- first 8 chars, shown in UI
  key_hash text not null,              -- bcrypt of the remainder
  rate_limit_per_min int not null default 60,
  monthly_minutes_limit int not null default 1000,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_company_idx on public.api_keys (company_id);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_owner_all" on public.api_keys;
create policy "api_keys_owner_all" on public.api_keys
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- Daily usage rollup (service-role only; RLS denies all by default with no policy)
create table if not exists public.api_usage (
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  usage_date date not null,
  requests int not null default 0,
  minutes_metered numeric(10,2) not null default 0,
  primary key (api_key_id, usage_date)
);

alter table public.api_usage enable row level security;
-- No policy ⇒ only service-role can read/write.

-- ---------------------------------------------------------------------------
-- excluded_numbers: per-company phone-number exclusion list (Callyzer parity)
-- ---------------------------------------------------------------------------
create table if not exists public.excluded_numbers (
  company_id uuid not null references public.companies(id) on delete cascade,
  phone_number text not null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (company_id, phone_number)
);

alter table public.excluded_numbers enable row level security;

drop policy if exists "excluded_numbers_owner_all" on public.excluded_numbers;
create policy "excluded_numbers_owner_all" on public.excluded_numbers
  for all using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- ---------------------------------------------------------------------------
-- Storage: company-assets bucket for logos (public-read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

-- Owner writes to their own company folder; reads are public (bucket is public).
drop policy if exists "company_assets_owner_write" on storage.objects;
create policy "company_assets_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'company-assets'
    and exists (
      select 1 from public.companies c
       where c.id::text = (storage.foldername(name))[1]
         and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists "company_assets_owner_update" on storage.objects;
create policy "company_assets_owner_update" on storage.objects
  for update using (
    bucket_id = 'company-assets'
    and exists (
      select 1 from public.companies c
       where c.id::text = (storage.foldername(name))[1]
         and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists "company_assets_owner_delete" on storage.objects;
create policy "company_assets_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'company-assets'
    and exists (
      select 1 from public.companies c
       where c.id::text = (storage.foldername(name))[1]
         and c.owner_user_id = auth.uid()
    )
  );

-- (Read is implicit because the bucket is public.)
