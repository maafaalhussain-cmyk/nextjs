-- J&M per-item barcode delivery evidence.
-- QR/barcode tokens and OTPs must be generated and hashed by trusted server code.
-- Never expose Supabase service-role credentials in the browser.

alter table public.order_items
  add column if not exists item_status text not null default 'preparing'
    check (item_status in ('preparing','shipped','out_for_delivery','delivered','delivery_issue','returned')),
  add column if not exists barcode_token_hash text unique,
  add column if not exists carrier_tracking_number text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  event_type text not null check (event_type in ('label_created','handed_to_carrier','in_transit','out_for_delivery','arrival_attempt','barcode_scanned','customer_confirmed','delivery_failed','returned')),
  event_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles(id),
  actor_type text not null check (actor_type in ('system','seller','carrier','customer','admin')),
  location_label text,
  note text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists delivery_events_item_time_idx
  on public.delivery_events(order_item_id,event_at desc);

create table if not exists public.delivery_confirmations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  barcode_scanned_at timestamptz,
  barcode_scan_reference text,
  otp_verified_at timestamptz,
  customer_confirmed_at timestamptz,
  confirmation_method text check (confirmation_method in ('otp','signature','authorized_recipient')),
  recipient_name text,
  proof_reference text,
  created_at timestamptz not null default now(),
  constraint delivery_confirmation_requires_proof
    check (customer_confirmed_at is null or (barcode_scanned_at is not null and ((confirmation_method = 'otp' and otp_verified_at is not null) or (confirmation_method in ('signature','authorized_recipient') and proof_reference is not null))))
);

alter table public.delivery_events enable row level security;
alter table public.delivery_confirmations enable row level security;

-- Customer and assigned seller may view evidence for their own order item.
drop policy if exists "customer read delivery events" on public.delivery_events;
create policy "customer read delivery events" on public.delivery_events
for select to authenticated using (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id and o.customer_id = (select auth.uid())
  )
);
drop policy if exists "seller read delivery events" on public.delivery_events;
create policy "seller read delivery events" on public.delivery_events
for select to authenticated using (
  exists (select 1 from public.order_items oi where oi.id = order_item_id and oi.seller_id = (select auth.uid()))
);

drop policy if exists "customer read delivery confirmation" on public.delivery_confirmations;
create policy "customer read delivery confirmation" on public.delivery_confirmations
for select to authenticated using (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id and o.customer_id = (select auth.uid())
  )
);
drop policy if exists "seller read delivery confirmation" on public.delivery_confirmations;
create policy "seller read delivery confirmation" on public.delivery_confirmations
for select to authenticated using (
  exists (select 1 from public.order_items oi where oi.id = order_item_id and oi.seller_id = (select auth.uid()))
);

-- No client INSERT/UPDATE policies: proof creation, QR validation, OTP verification,
-- and final delivery transition must happen only in trusted server-side functions.
revoke insert, update, delete on public.delivery_events from anon, authenticated;
revoke insert, update, delete on public.delivery_confirmations from anon, authenticated;
revoke update (item_status, barcode_token_hash, carrier_tracking_number, shipped_at, delivered_at)
  on public.order_items from anon, authenticated;
