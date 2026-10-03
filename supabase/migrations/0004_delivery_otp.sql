-- One-time delivery confirmation codes. Codes are hashed and expire quickly.
create table if not exists public.delivery_otps (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists delivery_otps_lookup_idx
  on public.delivery_otps(order_item_id,customer_id,created_at desc);
alter table public.delivery_otps enable row level security;
revoke all on public.delivery_otps from anon, authenticated;
