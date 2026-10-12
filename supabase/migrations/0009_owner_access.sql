-- J&M owner access layer. Apply after the canonical marketplace schema (0001_marketplace_core.sql).
-- Replace ALL occurrences of owner@example.com with the exact email of the existing owner account.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer'
    check (role in ('owner','admin','supervisor','seller','customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Update an existing owner-role table created by the earlier setup draft as well.
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('owner','admin','supervisor','seller','customer'));

alter table public.user_roles enable row level security;

create or replace function public.has_market_role(required_role text)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $fn$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = required_role
  );
$fn$;
revoke all on function public.has_market_role(text) from public;
grant execute on function public.has_market_role(text) to authenticated;

drop policy if exists "Read own role or owner can read roles" on public.user_roles;
create policy "Read own role or owner can read roles" on public.user_roles
for select to authenticated
using (user_id = (select auth.uid()) or public.has_market_role('owner'));
drop policy if exists "Only owner can add roles" on public.user_roles;
create policy "Only owner can add roles" on public.user_roles
for insert to authenticated with check (public.has_market_role('owner'));
drop policy if exists "Only owner can update roles" on public.user_roles;
create policy "Only owner can update roles" on public.user_roles
for update to authenticated using (public.has_market_role('owner'))
with check (public.has_market_role('owner'));
drop policy if exists "Only owner can delete roles" on public.user_roles;
create policy "Only owner can delete roles" on public.user_roles
for delete to authenticated using (public.has_market_role('owner'));
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

-- Granular supervisor access. Only trusted server-side owner APIs write this table.
create table if not exists public.supervisor_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  manage_products boolean not null default false,
  view_orders boolean not null default false,
  view_finance boolean not null default false,
  manage_sellers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.supervisor_permissions enable row level security;
revoke all on public.supervisor_permissions from anon, authenticated;
grant all on public.supervisor_permissions to service_role;

create or replace function public.has_market_permission(permission_name text)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $fn$
  select
    exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid()) and role in ('owner','admin')
    )
    or exists (
      select 1 from public.supervisor_permissions sp
      where sp.user_id = (select auth.uid())
      and case permission_name
        when 'manage_products' then sp.manage_products
        when 'view_orders' then sp.view_orders
        when 'view_finance' then sp.view_finance
        when 'manage_sellers' then sp.manage_sellers
        else false
      end
    );
$fn$;
revoke all on function public.has_market_permission(text) from public;
grant execute on function public.has_market_permission(text) to authenticated;

-- Owner/admin/supervisor policies. Access stays denied unless the permission is granted.
drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles for select to authenticated
using (public.has_market_role('owner') or public.has_market_role('admin') or public.has_market_permission('manage_sellers'));

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all to authenticated
using (public.has_market_permission('manage_products'))
with check (public.has_market_permission('manage_products'));

drop policy if exists "admins read all orders" on public.orders;
create policy "admins read all orders" on public.orders for select to authenticated
using (public.has_market_permission('view_orders'));

drop policy if exists "admins read all order items" on public.order_items;
create policy "admins read all order items" on public.order_items for select to authenticated
using (public.has_market_permission('view_orders'));

drop policy if exists "managers read seller applications" on public.seller_applications;
create policy "managers read seller applications" on public.seller_applications for select to authenticated
using (public.has_market_permission('manage_sellers'));

drop policy if exists "supervisors review seller applications" on public.seller_applications;
create policy "supervisors review seller applications" on public.seller_applications for update to authenticated
using (public.has_market_permission('manage_sellers'))
with check (public.has_market_permission('manage_sellers'));

-- Allow seller-application review only when the actor has the explicit manage_sellers permission.
create or replace function public.review_seller_application(application_id uuid, decision text)
returns void
language plpgsql security definer set search_path = ''
as $fn$
declare target_user uuid;
begin
  if auth.uid() is null or not public.has_market_permission('manage_sellers') then
    raise exception 'not authorized';
  end if;
  if decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  select user_id into target_user from public.seller_applications where id = application_id for update;
  if target_user is null then raise exception 'application not found'; end if;
  update public.seller_applications
    set status = decision, reviewed_at = now(), reviewed_by = (select auth.uid())
    where id = application_id;
  if decision = 'approved' then
    update public.profiles set role = 'seller', seller_status = 'approved', updated_at = now() where id = target_user;
  else
    update public.profiles set role = 'customer', seller_status = 'rejected', updated_at = now() where id = target_user;
  end if;
end;
$fn$;
revoke all on function public.review_seller_application(uuid,text) from public;
grant execute on function public.review_seller_application(uuid,text) to authenticated;

-- Recreate the finance RPC so supervisors can access it only when explicitly permitted.
create or replace function public.get_financial_report(
  p_from timestamptz,
  p_to timestamptz,
  p_granularity text default 'day',
  p_seller_id uuid default null,
  p_product_id uuid default null
)
returns table (
  period_start timestamp without time zone,
  account_code text,
  side text,
  seller_id uuid,
  product_id uuid,
  amount_halalas bigint,
  transaction_count bigint,
  entry_count bigint
)
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if auth.uid() is null or not (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or public.has_market_permission('view_finance')
  ) then
    raise exception 'not authorized';
  end if;
  if p_from is null or p_to is null or p_from >= p_to then raise exception 'invalid report range'; end if;
  if p_to - p_from > interval '3 years' then raise exception 'report range cannot exceed three years'; end if;
  if p_granularity not in ('minute','hour','day','week','month') then raise exception 'invalid report granularity'; end if;
  return query
  select date_trunc(p_granularity, ft.occurred_at at time zone 'Asia/Riyadh') as period_start,
    le.account_code, le.side, le.seller_id, le.product_id,
    sum(le.amount_halalas)::bigint, count(distinct ft.id)::bigint, count(le.id)::bigint
  from public.financial_transactions ft
  join public.financial_ledger_entries le on le.transaction_id = ft.id
  where ft.status = 'posted' and ft.occurred_at >= p_from and ft.occurred_at < p_to
    and (p_seller_id is null or le.seller_id = p_seller_id)
    and (p_product_id is null or le.product_id = p_product_id)
  group by 1,2,3,4,5 order by 1,2,3,4,5;
end;
$fn$;
revoke all on function public.get_financial_report(timestamptz,timestamptz,text,uuid,uuid) from public, anon;
grant execute on function public.get_financial_report(timestamptz,timestamptz,text,uuid,uuid) to authenticated;

-- Owner bootstrap: this must match an existing, verified Supabase Auth account.
insert into public.user_roles (user_id, role)
select id, 'owner' from auth.users where lower(email) = lower('owner@example.com')
on conflict (user_id) do update set role = 'owner', updated_at = now();

-- Legacy finance/seller RPCs check profiles.role = 'admin'.
update public.profiles set role = 'admin'
where id in (select id from auth.users where lower(email) = lower('owner@example.com'));

-- New accounts receive least privilege. Never trust requested_role from client metadata.
create or replace function public.assign_default_customer_role()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict (user_id) do nothing;
  return new;
end;
$fn$;
drop trigger if exists on_auth_user_created_assign_role on auth.users;
create trigger on_auth_user_created_assign_role after insert on auth.users
for each row execute procedure public.assign_default_customer_role();
