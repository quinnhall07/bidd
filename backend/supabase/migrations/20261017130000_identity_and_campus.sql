-- 001: campuses, verified-email campus membership, chapters, audit log, rate limits.
--
-- Security model:
--   * RLS is on for every table and denies by default. Policies below only ever grant SELECT.
--   * anon gets nothing. authenticated can read its own rows and its own campus's chapters.
--   * All writes to identity tables go through the backend (secret key) or SECURITY DEFINER
--     functions that only service_role / supabase_auth_admin may execute.
--   * Campus is derived from the verified email domain inside the database, never from a request.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.campuses (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 120),
  short_name  text not null check (char_length(short_name) between 2 and 40),
  conference  text not null default 'SEC',
  theme       jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Exact domains only: "crimson.ua.edu" matches, "x.crimson.ua.edu" and "crimson.ua.edu.evil.com" don't.
create table public.campus_email_domains (
  domain      text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  campus_id   uuid not null references public.campuses (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index campus_email_domains_campus_id_idx on public.campus_email_domains (campus_id);

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  display_name  text check (display_name is null or char_length(display_name) between 2 and 40),
  status        text not null default 'active' check (status in ('active', 'suspended')),
  role          text not null default 'student' check (role in ('student', 'admin')),
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One campus per user, set once from the verified email domain.
create table public.campus_memberships (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  campus_id        uuid not null references public.campuses (id),
  verified_domain  text not null,
  verified_at      timestamptz not null default now()
);
create index campus_memberships_campus_id_idx on public.campus_memberships (campus_id);

-- Chapters (and later brands) on a campus.
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  campus_id     uuid not null references public.campuses (id) on delete cascade,
  slug          text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (char_length(name) between 2 and 120),
  national_org  text,
  kind          text not null check (kind in ('sorority', 'fraternity', 'brand', 'other')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (campus_id, slug)
);

-- A chapter pick is a *request* (pending) until an officer approves it.
create table public.organization_memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  role             text not null default 'member' check (role in ('member', 'officer')),
  requested_at     timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       uuid references public.profiles (id) on delete set null,
  unique (organization_id, user_id)
);
create index organization_memberships_user_id_idx on public.organization_memberships (user_id);

create table public.audit_events (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  event       text not null,
  subject     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_events_actor_created_idx on public.audit_events (actor_id, created_at desc);

-- Fixed-window counters. Buckets are SHA-256 hashes (no raw emails or IPs).
create table private.rate_limits (
  bucket        text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (bucket, window_start)
);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- A chapter membership must be on the member's own campus.
create function private.enforce_membership_campus() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1
    from public.organizations o
    join public.campus_memberships m on m.campus_id = o.campus_id
    where o.id = new.organization_id and m.user_id = new.user_id
  ) then
    raise exception 'organization_not_on_user_campus' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger organization_memberships_same_campus
  before insert or update of organization_id, user_id on public.organization_memberships
  for each row execute function private.enforce_membership_campus();

-- ---------------------------------------------------------------------------
-- Row-level security (deny by default; SELECT-only policies)
-- ---------------------------------------------------------------------------

alter table public.campuses                 enable row level security;
alter table public.campus_email_domains     enable row level security;
alter table public.profiles                 enable row level security;
alter table public.campus_memberships       enable row level security;
alter table public.organizations            enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.audit_events             enable row level security;
alter table private.rate_limits             enable row level security;

revoke all on table
  public.campuses, public.campus_email_domains, public.profiles, public.campus_memberships,
  public.organizations, public.organization_memberships, public.audit_events
  from anon, authenticated;
revoke all on table private.rate_limits from public, anon, authenticated;

-- Read-only access for signed-in users; RLS narrows it to their own rows / campus.
grant select on table
  public.campuses, public.profiles, public.campus_memberships,
  public.organizations, public.organization_memberships
  to authenticated;

-- Helper for policies: the caller's campus. SECURITY DEFINER avoids recursive RLS lookups.
create function private.current_campus_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.campus_id from public.campus_memberships m where m.user_id = (select auth.uid())
$$;
revoke all on function private.current_campus_id() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_campus_id() to authenticated;

create policy "campuses: signed-in users read active campuses"
  on public.campuses for select to authenticated
  using (is_active);

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "campus_memberships: read own"
  on public.campus_memberships for select to authenticated
  using (user_id = (select auth.uid()));

create policy "organizations: read own campus"
  on public.organizations for select to authenticated
  using (is_active and campus_id = (select private.current_campus_id()));

create policy "organization_memberships: read own"
  on public.organization_memberships for select to authenticated
  using (user_id = (select auth.uid()));

-- campus_email_domains, audit_events, private.rate_limits: no policies -> no client access.

-- ---------------------------------------------------------------------------
-- Privileged functions
-- ---------------------------------------------------------------------------

-- Creates profile + campus membership from the user's verified email. Idempotent.
create function public.provision_user(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email      text;
  v_confirmed  timestamptz;
  v_domain     text;
  v_campus     uuid;
  v_existing   uuid;
  v_created    boolean := false;
begin
  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = p_user_id;

  if v_email is null then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  if v_confirmed is null then
    raise exception 'email_not_verified' using errcode = 'P0001';
  end if;

  v_domain := substring(v_email from '@([^@]+)$');

  select d.campus_id into v_campus
    from public.campus_email_domains d
    join public.campuses c on c.id = d.campus_id
   where d.domain = v_domain and c.is_active;

  if v_campus is null then
    raise exception 'domain_not_allowed' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email)
  values (p_user_id, v_email)
  on conflict (id) do nothing;

  insert into public.campus_memberships (user_id, campus_id, verified_domain)
  values (p_user_id, v_campus, v_domain)
  on conflict (user_id) do nothing;

  if found then
    v_created := true;
    insert into public.audit_events (actor_id, event, subject, metadata)
    values (p_user_id, 'account.provisioned', v_campus::text, jsonb_build_object('domain', v_domain));
  end if;

  select m.campus_id into v_existing from public.campus_memberships m where m.user_id = p_user_id;
  if v_existing is distinct from v_campus then
    raise exception 'campus_mismatch' using errcode = 'P0001';
  end if;

  return jsonb_build_object('campus_id', v_campus, 'created', v_created);
end;
$$;
revoke execute on function public.provision_user(uuid) from public, anon, authenticated;
grant execute on function public.provision_user(uuid) to service_role;

-- Counts one hit; returns true while the bucket is within p_max for the current window.
create function public.rate_limit_hit(p_bucket text, p_max integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_window  timestamptz;
  v_hits    integer;
begin
  if p_max < 1 or p_window_seconds < 1 or char_length(p_bucket) > 128 then
    raise exception 'invalid_rate_limit' using errcode = 'P0001';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;
revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- Supabase Auth "Before User Created" hook: reject any email whose exact domain isn't allowlisted.
-- Enable it in Dashboard -> Authentication -> Hooks -> Before User Created -> Postgres -> this function.
create function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_email   text;
  v_domain  text;
begin
  v_email := lower(trim(coalesce(event -> 'user' ->> 'email', '')));

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'Sign up with your school email address.'));
  end if;

  v_domain := substring(v_email from '@([^@]+)$');

  if exists (
    select 1
    from public.campus_email_domains d
    join public.campuses c on c.id = d.campus_id
    where d.domain = v_domain and c.is_active
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Bidd isn''t at your school yet.'));
end;
$$;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
