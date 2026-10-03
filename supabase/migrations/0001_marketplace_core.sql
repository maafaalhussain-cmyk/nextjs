-- J&M marketplace foundation. Run in Supabase SQL Editor before enabling sign-up.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer','seller','admin')),
  seller_status text not null default 'none' check (seller_status in ('none','not_applicable','pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  business_name text,
  commercial_registration text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  price numeric(12,2) not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'draft' check (status in ('draft','pending','active','rejected','archived')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_amount numeric(12,2) not null default 0 check (shipping_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  currency text not null default 'SAR' check (currency = 'SAR'),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  seller_id uuid not null references public.profiles(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price > 0)
);

create index if not exists products_status_created_idx on public.products(status, created_at desc);
create index if not exists products_seller_idx on public.products(seller_id);
create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);
create index if not exists order_items_seller_idx on public.order_items(seller_id);

-- Never trust client-supplied role metadata. All new users start as customers.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, role, seller_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    coalesce(new.raw_user_meta_data ->> 'phone',''),
    'customer',
    case when new.raw_user_meta_data ->> 'requested_role' = 'seller' then 'pending' else 'none' end
  ) on conflict (id) do nothing;

  if new.raw_user_meta_data ->> 'requested_role' = 'seller' then
    insert into public.seller_applications (user_id, status)
    values (new.id, 'pending') on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_jm on auth.users;
create trigger on_auth_user_created_jm after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.seller_applications enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Users may read/update only their own non-privileged profile fields.
drop policy if exists "profile read own" on public.profiles;
create policy "profile read own" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profile update own" on public.profiles;
create policy "profile update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name, phone, updated_at) on public.profiles to authenticated;

-- Applicants can read their own application; only admins may review.
drop policy if exists "seller application read own" on public.seller_applications;
create policy "seller application read own" on public.seller_applications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "seller application admin review" on public.seller_applications;
create policy "seller application admin review" on public.seller_applications for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Public catalog exposes only approved active products.
drop policy if exists "public active products" on public.products;
create policy "public active products" on public.products for select to anon, authenticated using (status = 'active');
drop policy if exists "seller read own products" on public.products;
create policy "seller read own products" on public.products for select to authenticated using (seller_id = (select auth.uid()));
drop policy if exists "approved sellers create products" on public.products;
create policy "approved sellers create products" on public.products for insert to authenticated
with check (seller_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'seller'
));
drop policy if exists "seller update own products" on public.products;
create policy "seller update own products" on public.products for update to authenticated
using (seller_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'seller'))
with check (seller_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'seller'));

-- Customers see only their own orders. Sellers see only order lines assigned to them.
drop policy if exists "customer read own orders" on public.orders;
create policy "customer read own orders" on public.orders for select to authenticated using (customer_id = (select auth.uid()));
drop policy if exists "customer create own order" on public.orders;
create policy "customer create own order" on public.orders for insert to authenticated with check (customer_id = (select auth.uid()));
drop policy if exists "seller read own order items" on public.order_items;
create policy "seller read own order items" on public.order_items for select to authenticated using (seller_id = (select auth.uid()));
drop policy if exists "customer read own order items" on public.order_items;
create policy "customer read own order items" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
);

-- Intentionally no client-side order-item insert, payment status update, or admin-role self-assignment.
-- Checkout/payment must be implemented with a trusted server function and verified payment webhooks.
