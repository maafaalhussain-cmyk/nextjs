-- J&M initial marketplace schema for Supabase
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer','seller','admin')),
  seller_status text not null default 'not_applicable' check (seller_status in ('not_applicable','pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'pending' check (status in ('draft','pending','active','rejected','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded')),
  subtotal numeric(10,2) not null default 0,
  shipping_total numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'SAR',
  shipping_address jsonb not null,
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  seller_id uuid not null references public.profiles(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  seller_status text not null default 'pending' check (seller_status in ('pending','accepted','rejected','processing','shipped','delivered'))
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id and role in ('customer','seller'));
create policy "profiles update own safe fields" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id and role in ('customer','seller'));

create policy "active products public read" on public.products for select to anon, authenticated using (status = 'active' or seller_id = auth.uid());
create policy "approved seller creates products" on public.products for insert to authenticated with check (
  seller_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'seller' and p.seller_status = 'approved')
);
create policy "seller manages own products" on public.products for update to authenticated using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "seller deletes own drafts" on public.products for delete to authenticated using (seller_id = auth.uid() and status in ('draft','rejected'));

create policy "customer reads own orders" on public.orders for select to authenticated using (customer_id = auth.uid());
create policy "customer creates own orders" on public.orders for insert to authenticated with check (customer_id = auth.uid());
create policy "customer reads own order items" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  or seller_id = auth.uid()
);

-- Create a profile automatically after Supabase Auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_role text;
begin
  chosen_role := case when new.raw_user_meta_data ->> 'role' = 'seller' then 'seller' else 'customer' end;
  insert into public.profiles (id, full_name, phone, role, seller_status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''), split_part(new.email,'@',1)),
    new.raw_user_meta_data ->> 'phone',
    chosen_role,
    case when chosen_role = 'seller' then 'pending' else 'not_applicable' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index if not exists products_status_category_idx on public.products(status, category);
create index if not exists products_seller_id_idx on public.products(seller_id);
create index if not exists orders_customer_id_created_at_idx on public.orders(customer_id, created_at desc);
create index if not exists order_items_seller_id_idx on public.order_items(seller_id);
