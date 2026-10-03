-- J&M promotions and coupon foundation.
-- Apply in staging only after the migration history and existing schema are reconciled.
-- All coupon validation, reservation, redemption and price calculation must run server-side.

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  max_discount numeric(12,2) check (max_discount is null or max_discount > 0),
  min_order_amount numeric(12,2) not null default 0 check (min_order_amount >= 0),
  currency text not null default 'SAR' check (currency = 'SAR'),
  scope text not null default 'platform' check (scope in ('platform','seller','product')),
  seller_id uuid references public.profiles(id),
  product_id uuid references public.products(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  coupon_code text,
  is_public boolean not null default false,
  stackable boolean not null default false,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','ended')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (discount_type = 'percentage' and discount_value <= 100)
    or discount_type = 'fixed'
  ),
  check (
    (scope = 'platform' and seller_id is null and product_id is null)
    or (scope = 'seller' and seller_id is not null and product_id is null)
    or (scope = 'product' and product_id is not null)
  ),
  check (coupon_code is null or coupon_code = upper(trim(coupon_code)))
);

create unique index if not exists promotions_coupon_code_unique
  on public.promotions(coupon_code) where coupon_code is not null;
create index if not exists promotions_active_window_idx
  on public.promotions(status, starts_at, ends_at);
create index if not exists promotions_seller_idx
  on public.promotions(seller_id) where seller_id is not null;
create index if not exists promotions_product_idx
  on public.promotions(product_id) where product_id is not null;

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id),
  customer_id uuid not null references public.profiles(id),
  order_id uuid not null references public.orders(id),
  order_item_id uuid references public.order_items(id),
  discount_amount numeric(12,2) not null check (discount_amount > 0),
  currency text not null default 'SAR' check (currency = 'SAR'),
  status text not null default 'reserved' check (status in ('reserved','redeemed','released','refunded')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (promotion_id, customer_id, order_id)
);

create index if not exists promotion_redemptions_customer_idx
  on public.promotion_redemptions(promotion_id, customer_id, status);
create index if not exists promotion_redemptions_order_idx
  on public.promotion_redemptions(order_id);

alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;

-- Only active, public, currently valid promotions are visible to shoppers.
drop policy if exists "public read active promotions" on public.promotions;
create policy "public read active promotions" on public.promotions
for select to anon, authenticated
using (
  is_public = true and status = 'active'
  and starts_at <= now() and ends_at > now()
);

-- Admin-only visibility for private coupons and campaign management.
drop policy if exists "admin reads all promotions" on public.promotions;
create policy "admin reads all promotions" on public.promotions
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
));

-- Customers can see only their own coupon applications; sellers see their own order items' entries.
drop policy if exists "customers read own promotion redemptions" on public.promotion_redemptions;
create policy "customers read own promotion redemptions" on public.promotion_redemptions
for select to authenticated
using (customer_id = (select auth.uid()));

drop policy if exists "admins read all promotion redemptions" on public.promotion_redemptions;
create policy "admins read all promotion redemptions" on public.promotion_redemptions
for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
));

-- No browser-side writes: trusted checkout/refund services must reserve, redeem or release coupons
-- atomically with stock reservation, order creation and verified payment events.
revoke all on public.promotions from anon, authenticated;
revoke all on public.promotion_redemptions from anon, authenticated;
grant select on public.promotions, public.promotion_redemptions to anon, authenticated;

comment on table public.promotions is
  'Campaigns and coupons. Validate eligibility and calculate discounts only in trusted server-side checkout.';
comment on table public.promotion_redemptions is
  'Idempotent per-order coupon reservations/redemptions, released on failed or cancelled checkout.';
