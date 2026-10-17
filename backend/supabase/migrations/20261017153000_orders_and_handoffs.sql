-- 003: orders and in-person QR handoffs. Pilot version: NO payments are collected.
--
-- Flow: buyer checks out (listing -> reserved, order pending_meetup) -> they meet on campus ->
-- buyer shows a one-time QR token -> seller scans it (order completed, listing sold).
-- All state changes happen inside SECURITY DEFINER functions callable only by service_role,
-- with row locks so a listing can't be bought twice and a token can't be used twice.

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings (id) on delete cascade,
  campus_id        uuid not null references public.campuses (id),
  buyer_id         uuid not null references public.profiles (id) on delete cascade,
  seller_id        uuid not null references public.profiles (id) on delete cascade,
  price_cents      integer not null check (price_cents > 0),
  buyer_fee_cents  integer not null check (buyer_fee_cents >= 0),
  total_cents      integer generated always as (price_cents + buyer_fee_cents) stored,
  payment_status   text not null default 'not_collected' check (payment_status in ('not_collected')),
  status           text not null default 'pending_meetup' check (status in ('pending_meetup', 'completed', 'cancelled')),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  cancelled_at     timestamptz,
  cancelled_by     uuid references public.profiles (id) on delete set null,
  check (buyer_id <> seller_id)
);
-- Backstop for the row lock: at most one open or completed order per listing.
create unique index orders_one_live_per_listing on public.orders (listing_id) where status in ('pending_meetup', 'completed');
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);

-- Only SHA-256 hashes are stored; the raw token exists only in the buyer's QR code.
create table private.handoff_tokens (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index handoff_tokens_order_idx on private.handoff_tokens (order_id);

alter table public.orders enable row level security;
alter table private.handoff_tokens enable row level security;
revoke all on table public.orders from anon, authenticated;
revoke all on table private.handoff_tokens from public, anon, authenticated;
grant select on table public.orders to authenticated;

create policy "orders: buyer or seller reads"
  on public.orders for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- State transitions (service_role only)
-- ---------------------------------------------------------------------------

-- Reserve an active listing for a buyer on the same campus. Price and fee come from the database.
create function public.create_order(p_listing_id uuid, p_buyer_id uuid) returns uuid
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

  insert into public.orders (listing_id, campus_id, buyer_id, seller_id, price_cents, buyer_fee_cents)
  values (v_listing.id, v_listing.campus_id, p_buyer_id, v_listing.seller_id, v_listing.price_cents,
          round(v_listing.price_cents * 0.05)::integer + 50)
  returning id into v_order;

  update public.listings set status = 'reserved' where id = v_listing.id;

  insert into public.audit_events (actor_id, event, subject) values (p_buyer_id, 'order.created', v_order::text);
  return v_order;
end;
$$;

-- Issue a fresh one-time handoff token for the buyer (earlier unused tokens are revoked).
create function public.create_handoff_token(p_order_id uuid, p_buyer_id uuid, p_token_hash text, p_ttl_seconds integer)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_order    public.orders%rowtype;
  v_expires  timestamptz := now() + make_interval(secs => p_ttl_seconds);
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.buyer_id <> p_buyer_id then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status <> 'pending_meetup' then
    raise exception 'order_not_open' using errcode = 'P0001';
  end if;

  delete from private.handoff_tokens where order_id = p_order_id and used_at is null;
  insert into private.handoff_tokens (order_id, token_hash, expires_at) values (p_order_id, p_token_hash, v_expires);
  return v_expires;
end;
$$;

-- Seller scans the buyer's QR: one use, unexpired, seller of that order only.
create function public.confirm_handoff(p_token_hash text, p_seller_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_token  private.handoff_tokens%rowtype;
  v_order  public.orders%rowtype;
begin
  select * into v_token from private.handoff_tokens where token_hash = p_token_hash for update;
  if v_token.id is null then
    raise exception 'invalid_handoff' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_token.order_id for update;
  -- Someone other than the seller gets the same answer as a bad token.
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

  insert into public.audit_events (actor_id, event, subject) values (p_seller_id, 'handoff.confirmed', v_order.id::text);
  return v_order.id;
end;
$$;

-- Buyer or seller backs out before the meetup; the listing goes back on the feed.
create function public.cancel_order(p_order_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order  public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or p_user_id not in (v_order.buyer_id, v_order.seller_id) then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status <> 'pending_meetup' then
    raise exception 'order_not_open' using errcode = 'P0001';
  end if;

  update public.orders set status = 'cancelled', cancelled_at = now(), cancelled_by = p_user_id where id = v_order.id;
  update public.listings set status = 'active' where id = v_order.listing_id and status = 'reserved';
  delete from private.handoff_tokens where order_id = v_order.id;

  insert into public.audit_events (actor_id, event, subject) values (p_user_id, 'order.cancelled', v_order.id::text);
end;
$$;

revoke execute on function public.create_order(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.create_handoff_token(uuid, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.confirm_handoff(text, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_order(uuid, uuid) to service_role;
grant execute on function public.create_handoff_token(uuid, uuid, text, integer) to service_role;
grant execute on function public.confirm_handoff(text, uuid) to service_role;
grant execute on function public.cancel_order(uuid, uuid) to service_role;
