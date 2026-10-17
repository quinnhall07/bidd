-- 005: live ascending bidding on resale listings.
--
-- A listing is an auction while listings.auction_ends_at is set. Bids are append-only rows written
-- only by SECURITY DEFINER functions that service_role alone may call. Clients can't read or write
-- listing_bids at all: the API returns amounts with anonymized bidders ("You" / "Bidder N").
-- Every bid locks the listing row, so bids on one listing are serialized: amounts strictly increase
-- and the minimum is always checked against the true high bid. Times come from clock_timestamp()
-- (taken after the lock), so a bid that waited on the lock can't be stamped earlier than the one
-- before it. Same model as before: RLS on, deny by default. Nothing here deletes existing data.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Auction fields on listings
-- ---------------------------------------------------------------------------

alter table public.listings
  add column if not exists auction_ends_at      timestamptz,
  add column if not exists auction_start_cents  integer;

-- Same range as price_cents ($1.00-$1,000.00).
alter table public.listings drop constraint if exists listings_auction_start_cents_range;
alter table public.listings add constraint listings_auction_start_cents_range
  check (auction_start_cents is null or auction_start_cents between 100 and 100000);

-- Both set (an auction) or both null (fixed price).
alter table public.listings drop constraint if exists listings_auction_fields_together;
alter table public.listings add constraint listings_auction_fields_together
  check ((auction_ends_at is null) = (auction_start_cents is null));

-- ---------------------------------------------------------------------------
-- Bids
-- ---------------------------------------------------------------------------

create table if not exists public.listing_bids (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  campus_id     uuid not null references public.campuses (id),
  bidder_id     uuid not null references public.profiles (id) on delete cascade,
  amount_cents  integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  created_at    timestamptz not null default now()
);
-- Amounts strictly increase per listing, so (listing, amount) is unique. This is also the high-bid
-- lookup and a backstop for the row lock.
create unique index if not exists listing_bids_listing_amount_idx on public.listing_bids (listing_id, amount_cents desc);
create index if not exists listing_bids_bidder_idx on public.listing_bids (bidder_id, created_at desc);

alter table public.listing_bids enable row level security;
-- No policies and no client grants: clients never see bidder ids. The API serves bids anonymized.
-- service_role (the backend's secret key) may only READ bids: Supabase's default privileges would
-- otherwise give it INSERT/UPDATE/DELETE/TRUNCATE, so a backend bug could write a bid that skipped
-- the lock, the minimum and the clock. Inserts happen only inside place_listing_bid (runs as the
-- table owner); FK cascades from listings/profiles also run as the owner and still work.
revoke all on table public.listing_bids from public, anon, authenticated, service_role;
grant select on table public.listing_bids to service_role;

-- ---------------------------------------------------------------------------
-- State transitions (service_role only)
-- ---------------------------------------------------------------------------

-- Seller turns an active listing into an auction (or re-times one that has no bids yet).
create or replace function public.start_listing_auction(p_listing_id uuid, p_seller_id uuid, p_start_cents integer, p_hours integer)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_listing  public.listings%rowtype;
  v_campus   uuid;
  v_ends     timestamptz;
begin
  if p_start_cents is null or p_start_cents not between 100 and 100000
     or p_hours is null or p_hours not between 1 and 168 then
    raise exception 'invalid_auction' using errcode = 'P0001';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  select m.campus_id into v_campus from public.campus_memberships m where m.user_id = p_seller_id;

  -- Someone else's listing, or another campus's, looks exactly like a missing one.
  if v_listing.id is null or v_campus is null or v_listing.campus_id <> v_campus
     or v_listing.seller_id <> p_seller_id then
    raise exception 'listing_not_found' using errcode = 'P0001';
  end if;
  if v_listing.status <> 'active' then
    raise exception 'listing_not_active' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.listing_bids b where b.listing_id = v_listing.id) then
    raise exception 'auction_has_bids' using errcode = 'P0001';
  end if;

  v_ends := clock_timestamp() + make_interval(hours => p_hours);
  update public.listings
     set auction_start_cents = p_start_cents, auction_ends_at = v_ends
   where id = v_listing.id;

  insert into public.audit_events (actor_id, event, subject, metadata)
  values (p_seller_id, 'auction.started', v_listing.id::text,
          jsonb_build_object('start_cents', p_start_cents, 'hours', p_hours));
  return v_ends;
end;
$$;

-- A student bids on an auction on their own campus. The minimum, the clock and anti-sniping all
-- come from the database. Minimum next bid: the start price with no bids, otherwise the high bid
-- plus the larger of $1 and 5% of the high bid rounded up to a whole dollar.
create or replace function public.place_listing_bid(p_listing_id uuid, p_bidder_id uuid, p_amount_cents integer)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_listing   public.listings%rowtype;
  v_campus    uuid;
  v_now       timestamptz;
  v_high      integer;
  v_min       integer;
  v_ends      timestamptz;
  v_extended  boolean := false;
  v_bid       uuid;
begin
  -- Same range as listing_bids.amount_cents, checked here so a bad amount gets a named error
  -- instead of a raw check_violation (the API's body schema enforces it first).
  if p_amount_cents is null or p_amount_cents not between 1 and 10000000 then
    raise exception 'invalid_bid' using errcode = 'P0001';
  end if;

  -- The row lock serializes bids on this listing (checkout locks the same row).
  select * into v_listing from public.listings where id = p_listing_id for update;
  select m.campus_id into v_campus from public.campus_memberships m where m.user_id = p_bidder_id;
  v_now := clock_timestamp();

  -- Another campus's listing (or a draft/removed one) looks exactly like a missing one.
  if v_listing.id is null or v_campus is null or v_listing.campus_id <> v_campus
     or v_listing.status not in ('active', 'reserved', 'sold') then
    raise exception 'listing_not_found' using errcode = 'P0001';
  end if;
  if v_listing.auction_ends_at is null then
    raise exception 'not_an_auction' using errcode = 'P0001';
  end if;
  if v_listing.seller_id = p_bidder_id then
    raise exception 'own_listing' using errcode = 'P0001';
  end if;
  if v_listing.status <> 'active' or v_now >= v_listing.auction_ends_at then
    raise exception 'auction_ended' using errcode = 'P0001';
  end if;

  select max(b.amount_cents) into v_high from public.listing_bids b where b.listing_id = v_listing.id;
  v_min := case
    when v_high is null then v_listing.auction_start_cents
    else v_high + greatest(100, ((v_high + 1999) / 2000) * 100)  -- ceil(5% to a dollar), integer math
  end;
  if p_amount_cents < v_min then
    -- The minimum travels in the message (and DETAIL) so the API can name it.
    raise exception 'bid_too_low:%', v_min using errcode = 'P0001', detail = v_min::text;
  end if;

  -- Anti-sniping: a bid in the last 2 minutes puts the clock back to 2 minutes.
  v_ends := v_listing.auction_ends_at;
  if v_ends - v_now < interval '2 minutes' then
    v_ends := v_now + interval '2 minutes';
    v_extended := true;
    update public.listings set auction_ends_at = v_ends where id = v_listing.id;
  end if;

  insert into public.listing_bids (listing_id, campus_id, bidder_id, amount_cents, created_at)
  values (v_listing.id, v_listing.campus_id, p_bidder_id, p_amount_cents, v_now)
  returning id into v_bid;

  insert into public.audit_events (actor_id, event, subject, metadata)
  values (p_bidder_id, 'bid.placed', v_listing.id::text,
          jsonb_build_object('bid_id', v_bid, 'amount_cents', p_amount_cents, 'extended', v_extended));

  return jsonb_build_object(
    'bid_id', v_bid,
    'high_cents', p_amount_cents,
    'min_next_cents', p_amount_cents + greatest(100, ((p_amount_cents + 1999) / 2000) * 100),
    'ends_at', v_ends,
    'extended', v_extended
  );
end;
$$;

-- Same as 003, plus: a running auction, or an ended one that has bids, can't be bought at the list
-- price. An auction that ended with no bids falls back to a normal fixed-price listing.
create or replace function public.create_order(p_listing_id uuid, p_buyer_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_listing  public.listings%rowtype;
  v_campus   uuid;
  v_order    uuid;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  select m.campus_id into v_campus from public.campus_memberships m where m.user_id = p_buyer_id;

  -- Another campus's listing looks exactly like a missing one.
  if v_listing.id is null or v_campus is null or v_listing.campus_id <> v_campus then
    raise exception 'listing_not_found' using errcode = 'P0001';
  end if;
  if v_listing.seller_id = p_buyer_id then
    raise exception 'cannot_buy_own_listing' using errcode = 'P0001';
  end if;
  if v_listing.status <> 'active' then
    raise exception 'listing_unavailable' using errcode = 'P0001';
  end if;
  if v_listing.auction_ends_at is not null and (
       v_listing.auction_ends_at > clock_timestamp()
       or exists (select 1 from public.listing_bids b where b.listing_id = v_listing.id)) then
    raise exception 'listing_unavailable' using errcode = 'P0001';
  end if;

  insert into public.orders (listing_id, campus_id, buyer_id, seller_id, price_cents, buyer_fee_cents)
  values (v_listing.id, v_listing.campus_id, p_buyer_id, v_listing.seller_id, v_listing.price_cents,
          round(v_listing.price_cents * 0.05)::integer + 50)
  returning id into v_order;

  update public.listings set status = 'reserved' where id = v_listing.id;

  insert into public.audit_events (actor_id, event, subject) values (p_buyer_id, 'order.created', v_order::text);
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions for the new functions (create_order keeps its 003 grants; restated for clarity)
-- ---------------------------------------------------------------------------

revoke execute on function public.start_listing_auction(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.place_listing_bid(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.create_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_listing_auction(uuid, uuid, integer, integer) to service_role;
grant execute on function public.place_listing_bid(uuid, uuid, integer) to service_role;
grant execute on function public.create_order(uuid, uuid) to service_role;
