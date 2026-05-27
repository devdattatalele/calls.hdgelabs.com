-- 0005_billing.sql
-- Adds Polar billing fields to companies + a typed plan column for the
-- per-user / per-minute tiers used by calls.hdgelabs.com.
--
-- Safe to re-run.

alter table public.companies
  add column if not exists max_team_members int not null default 1,
  add column if not exists max_devices int not null default 1,
  add column if not exists monthly_minutes_limit int not null default 50,
  add column if not exists polar_customer_id text,
  add column if not exists polar_subscription_id text,
  add column if not exists subscription_status text not null default 'free',
  add column if not exists current_period_end timestamptz;

-- Free tier defaults: 1 user / 1 device / 50 minutes. Paid tiers update via
-- the billing webhook.

-- View used by the dashboard for the "Billing" page (single row per company).
create or replace view public.company_billing
  with (security_invoker = true)
as
  select
    c.id                       as company_id,
    c.plan,
    c.subscription_status,
    c.max_team_members,
    c.max_devices,
    c.monthly_minutes_limit,
    c.current_period_end,
    c.polar_customer_id,
    c.polar_subscription_id,
    -- minutes used this month (sum of duration_sec for calls with recording / 60)
    coalesce(
      (select sum(duration_sec) / 60.0
         from public.calls cc
        where cc.company_id = c.id
          and cc.recording_storage_path is not null
          and cc.started_at >= date_trunc('month', now())),
      0
    ) as minutes_used_this_month,
    -- active members and devices
    (select count(*) from public.company_members m
       where m.company_id = c.id and m.deactivated_at is null) as active_members,
    (select count(distinct d.id) from public.devices d
       where d.company_id = c.id) as active_devices
    from public.companies c;
