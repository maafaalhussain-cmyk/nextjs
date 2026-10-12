-- J&M marketplace roles. Run in Supabase SQL Editor.
-- Replace owner@example.com below with the exact email of the existing owner account.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('owner','admin','seller','customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

create or replace function public.has_market_role(required_role text)
returns boolean language sql stable security definer
set search_path = '' set row_security = off as $$
  select exists(select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = required_role);
$$;
revoke all on function public.has_market_role(text) from public;
grant execute on function public.has_market_role(text) to authenticated;

drop policy if exists "Read own role or owner can read roles" on public.user_roles;
create policy "Read own role or owner can read roles" on public.user_roles
for select to authenticated using (user_id = (select auth.uid()) or public.has_market_role('owner'));
drop policy if exists "Only owner can add roles" on public.user_roles;
create policy "Only owner can add roles" on public.user_roles
for insert to authenticated with check (public.has_market_role('owner'));
drop policy if exists "Only owner can update roles" on public.user_roles;
create policy "Only owner can update roles" on public.user_roles
for update to authenticated using (public.has_market_role('owner')) with check (public.has_market_role('owner'));
drop policy if exists "Only owner can delete roles" on public.user_roles;
create policy "Only owner can delete roles" on public.user_roles
for delete to authenticated using (public.has_market_role('owner'));
grant select, insert, update, delete on public.user_roles to authenticated;

-- OWNER BOOTSTRAP: replace the email and run this after the table above is created.
insert into public.user_roles (user_id, role)
select id, 'owner' from auth.users where lower(email) = lower('owner@example.com')
on conflict (user_id) do update set role = 'owner', updated_at = now();

-- All new users get customer role; client-supplied requested_role is not trusted.
create or replace function public.assign_default_customer_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_assign_role on auth.users;
create trigger on_auth_user_created_assign_role after insert on auth.users
for each row execute procedure public.assign_default_customer_role();
