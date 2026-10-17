-- 004: Closet Cup scoring, chapter officer approvals, listing reports, blocks.
--
-- Same model as before: RLS on, deny by default; every state change is a SECURITY DEFINER
-- function only service_role can call. Nothing here deletes existing data.

-- ---------------------------------------------------------------------------
-- Closet Cup
-- ---------------------------------------------------------------------------

-- One scoring event per completed order, credited to the seller's APPROVED chapter at sale time.
create table public.cup_events (
  id               uuid primary key default gen_random_uuid(),
  campus_id        uuid not null references public.campuses (id),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  order_id         uuid not null unique references public.orders (id) on delete cascade,
  points           integer not null check (points > 0),
  created_at       timestamptz not null default now()
);
create index cup_events_org_idx on public.cup_events (organization_id);
create index cup_events_campus_idx on public.cup_events (campus_id);

alter table public.cup_events enable row level security;
revoke all on table public.cup_events from anon, authenticated;
-- No policies: clients only ever see the aggregates below, through the API.

-- Same as 003, plus the Cup award (10 points to the seller's active chapter, at most once per order).
create or replace function public.confirm_handoff(p_token_hash text, p_seller_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_token  private.handoff_tokens%rowtype;
  v_order  public.orders%rowtype;
  v_org    uuid;
begin
  select * into v_token from private.handoff_tokens where token_hash = p_token_hash for update;
  if v_token.id is null then
    raise exception 'invalid_handoff' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_token.order_id for update;
  if v_order.seller_id <> p_seller_id then
    raise exception 'invalid_handoff' using errcode = 'P0001';
  end if;
  if v_token.used_at is not null then
    raise exception 'handoff_already_used' using errcode = 'P0001';
  end if;
  if v_token.expires_at < now() then
    raise exception 'handoff_expired' using errcode = 'P0001';
  end if;
  if v_order.status <> 'pending_meetup' then
    raise exception 'order_not_open' using errcode = 'P0001';
  end if;

  update private.handoff_tokens set used_at = now() where id = v_token.id;
  update public.orders set status = 'completed', completed_at = now() where id = v_order.id;
  update public.listings set status = 'sold' where id = v_order.listing_id;

  select om.organization_id into v_org
    from public.organization_memberships om
    join public.organizations o on o.id = om.organization_id
   where om.user_id = v_order.seller_id and om.status = 'active' and o.campus_id = v_order.campus_id
   order by om.decided_at nulls last
   limit 1;
  if v_org is not null then
    insert into public.cup_events (campus_id, organization_id, order_id, points)
    values (v_order.campus_id, v_org, v_order.id, 10)
    on conflict (order_id) do nothing;
  end if;

  insert into public.audit_events (actor_id, event, subject) values (p_seller_id, 'handoff.confirmed', v_order.id::text);
  return v_order.id;
end;
$$;

-- Chapter standings on one campus (sororities + fraternities, zero-point chapters included).
create function public.cup_campus_standings(p_campus_id uuid)
returns table (organization_id uuid, name text, kind text, points bigint, sales bigint)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.kind, coalesce(sum(e.points), 0)::bigint, count(e.id)::bigint
    from public.organizations o
    left join public.cup_events e on e.organization_id = o.id
   where o.campus_id = p_campus_id and o.is_active and o.kind in ('sorority', 'fraternity')
   group by o.id, o.name, o.kind
   order by 4 desc, o.name;
$$;

-- Campus totals across the conference (aggregates only).
create function public.cup_conference_standings()
returns table (campus_id uuid, slug text, name text, short_name text, points bigint, sales bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.name, c.short_name, coalesce(sum(e.points), 0)::bigint, count(e.id)::bigint
    from public.campuses c
    left join public.cup_events e on e.campus_id = c.id
   where c.is_active
   group by c.id, c.slug, c.name, c.short_name
   order by 5 desc, c.name;
$$;

-- ---------------------------------------------------------------------------
-- Chapter officer approvals
-- ---------------------------------------------------------------------------

-- An ACTIVE officer of the same chapter approves or rejects a pending request.
create function public.decide_chapter_request(p_membership_id uuid, p_officer_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_m  public.organization_memberships%rowtype;
begin
  select * into v_m from public.organization_memberships where id = p_membership_id for update;
  if v_m.id is null or not exists (
    select 1 from public.organization_memberships o
     where o.organization_id = v_m.organization_id and o.user_id = p_officer_id
       and o.status = 'active' and o.role = 'officer'
  ) then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  if v_m.status <> 'pending' then
    raise exception 'request_not_pending' using errcode = 'P0001';
  end if;

  update public.organization_memberships
     set status = case when p_approve then 'active' else 'rejected' end,
         decided_at = now(), decided_by = p_officer_id
   where id = v_m.id;

  insert into public.audit_events (actor_id, event, subject)
  values (p_officer_id, case when p_approve then 'chapter.approved' else 'chapter.rejected' end, v_m.id::text);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reports (3 different students -> listing auto-hidden)
-- ---------------------------------------------------------------------------

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text not null check (reason in ('prohibited_item', 'scam_or_fraud', 'offensive', 'wrong_item', 'other')),
  details      text check (details is null or char_length(details) <= 500),
  status       text not null default 'open' check (status in ('open', 'resolved')),
  created_at   timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index reports_listing_idx on public.reports (listing_id) where status = 'open';

alter table public.reports enable row level security;
revoke all on table public.reports from anon, authenticated;

create function public.report_listing(p_listing_id uuid, p_reporter_id uuid, p_reason text, p_details text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_listing  public.listings%rowtype;
  v_campus   uuid;
  v_open     integer;
  v_hidden   boolean := false;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  select m.campus_id into v_campus from public.campus_memberships m where m.user_id = p_reporter_id;
  if v_listing.id is null or v_campus is null or v_listing.campus_id <> v_campus
     or v_listing.status not in ('active', 'reserved', 'sold') then
    raise exception 'listing_not_found' using errcode = 'P0001';
  end if;
  if v_listing.seller_id = p_reporter_id then
    raise exception 'cannot_report_own_listing' using errcode = 'P0001';
  end if;

  -- One report per student per listing; repeats are ignored.
  insert into public.reports (listing_id, reporter_id, reason, details)
  values (p_listing_id, p_reporter_id, p_reason, nullif(trim(p_details), ''))
  on conflict (listing_id, reporter_id) do nothing;

  select count(*) into v_open from public.reports where listing_id = p_listing_id and status = 'open';
  if v_open >= 3 and v_listing.status = 'active' then
    update public.listings set status = 'removed' where id = p_listing_id;
    v_hidden := true;
    insert into public.audit_events (actor_id, event, subject, metadata)
    values (null, 'listing.auto_hidden', p_listing_id::text, jsonb_build_object('open_reports', v_open));
  end if;

  return jsonb_build_object('hidden', v_hidden or v_listing.status = 'removed');
end;
$$;

-- ---------------------------------------------------------------------------
-- Blocks (hide a seller from my feed)
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
revoke all on table public.blocks from anon, authenticated;
grant select on table public.blocks to authenticated;
create policy "blocks: read own"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Permissions for the new functions
-- ---------------------------------------------------------------------------

revoke execute on function public.cup_campus_standings(uuid) from public, anon, authenticated;
revoke execute on function public.cup_conference_standings() from public, anon, authenticated;
revoke execute on function public.decide_chapter_request(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.report_listing(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.cup_campus_standings(uuid) to service_role;
grant execute on function public.cup_conference_standings() to service_role;
grant execute on function public.decide_chapter_request(uuid, uuid, boolean) to service_role;
grant execute on function public.report_listing(uuid, uuid, text, text) to service_role;
