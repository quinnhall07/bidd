-- 002: closets, listings, listing photos, private photo bucket.
--
-- Same model as 001: RLS on, deny by default, SELECT-only policies. All writes go through the
-- backend. Triggers keep every listing on its seller's verified campus, whatever the caller sends.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.closets (
  id               uuid primary key default gen_random_uuid(),
  campus_id        uuid not null references public.campuses (id),
  kind             text not null check (kind in ('personal', 'chapter', 'brand')),
  owner_id         uuid references public.profiles (id) on delete cascade,
  organization_id  uuid references public.organizations (id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 80),
  created_at       timestamptz not null default now(),
  check (
    (kind = 'personal' and owner_id is not null and organization_id is null)
    or (kind <> 'personal' and organization_id is not null)
  )
);
create unique index closets_one_personal_per_user on public.closets (owner_id) where kind = 'personal';
create index closets_campus_id_idx on public.closets (campus_id);

create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  campus_id     uuid not null references public.campuses (id),
  closet_id     uuid not null references public.closets (id) on delete cascade,
  seller_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 80),
  description   text not null default '' check (char_length(description) <= 1000),
  brand         text check (brand is null or char_length(brand) between 1 and 60),
  price_cents   integer not null check (price_cents between 100 and 100000),
  size          text not null check (size in ('XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL',
                                              '0', '2', '4', '6', '8', '10', '12', '14', 'ONE_SIZE')),
  condition     text not null check (condition in ('new_with_tags', 'like_new', 'good', 'fair')),
  tags          text[] not null default '{}'
                check (tags <@ array['rush', 'bid_day', 'gameday', 'formal']::text[] and cardinality(tags) <= 4),
  status        text not null default 'draft' check (status in ('draft', 'active', 'reserved', 'sold', 'removed')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index listings_feed_idx on public.listings (campus_id, status, published_at desc, id desc);
create index listings_seller_idx on public.listings (seller_id, created_at desc);
create index listings_tags_idx on public.listings using gin (tags);

create table public.listing_media (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  storage_path  text not null unique,
  position      smallint not null check (position between 0 and 99),
  width         integer,
  height        integer,
  created_at    timestamptz not null default now(),
  unique (listing_id, position)
);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function private.touch_updated_at();

-- A listing lives on its seller's verified campus, in a closet on that campus the seller may use.
create function private.enforce_listing_campus() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_campus  uuid;
  v_closet  public.closets%rowtype;
begin
  select m.campus_id into v_campus from public.campus_memberships m where m.user_id = new.seller_id;
  if v_campus is null or new.campus_id is distinct from v_campus then
    raise exception 'listing_campus_mismatch' using errcode = 'P0001';
  end if;

  select * into v_closet from public.closets c where c.id = new.closet_id;
  if v_closet.id is null or v_closet.campus_id <> v_campus
     or (v_closet.kind = 'personal' and v_closet.owner_id <> new.seller_id) then
    raise exception 'listing_closet_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger listings_same_campus
  before insert or update of campus_id, seller_id, closet_id on public.listings
  for each row execute function private.enforce_listing_campus();

-- At most 6 photos per listing.
create function private.enforce_media_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.listing_media where listing_id = new.listing_id) >= 6 then
    raise exception 'too_many_photos' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger listing_media_limit
  before insert on public.listing_media
  for each row execute function private.enforce_media_limit();

-- ---------------------------------------------------------------------------
-- Row-level security (deny by default; SELECT-only policies)
-- ---------------------------------------------------------------------------

alter table public.closets       enable row level security;
alter table public.listings      enable row level security;
alter table public.listing_media enable row level security;

revoke all on table public.closets, public.listings, public.listing_media from anon, authenticated;
grant select on table public.closets, public.listings, public.listing_media to authenticated;

create policy "closets: read own campus"
  on public.closets for select to authenticated
  using (campus_id = (select private.current_campus_id()));

-- Own campus only. Drafts and removed listings are visible to their seller alone.
create policy "listings: read own campus, published or own"
  on public.listings for select to authenticated
  using (
    campus_id = (select private.current_campus_id())
    and (status in ('active', 'reserved', 'sold') or seller_id = (select auth.uid()))
  );

-- A photo is visible exactly when its listing is (the subquery is itself filtered by RLS).
create policy "listing_media: read when listing is visible"
  on public.listing_media for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

-- ---------------------------------------------------------------------------
-- Storage: private bucket, server-written WebP only. No storage.objects policies, so clients
-- can neither read nor write directly; the backend hands out short-lived signed URLs.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', false, 5242880, array['image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
