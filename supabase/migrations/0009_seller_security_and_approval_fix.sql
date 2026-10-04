-- Correct seller approval state and close a permissive seller product update policy.
-- This migration assumes the canonical marketplace_core schema is installed.
drop policy if exists "seller update own products" on public.products;
drop policy if exists "seller manages own products" on public.products;
drop policy if exists "seller edits own unpublished products" on public.products;

create policy "seller edits own unpublished products"
on public.products
for update to authenticated
using (
  seller_id = (select auth.uid())
  and status in ('draft','pending','rejected')
)
with check (
  seller_id = (select auth.uid())
  and status in ('draft','pending','rejected')
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'seller'
      and p.seller_status = 'approved'
  )
);

create or replace function public.review_seller_application(application_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'not authorized';
  end if;

  if decision not in ('approved','rejected') then
    raise exception 'invalid decision';
  end if;

  select user_id into target_user
  from public.seller_applications
  where id = application_id
  for update;

  if target_user is null then
    raise exception 'application not found';
  end if;

  update public.seller_applications
  set status = decision,
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = application_id;

  update public.profiles
  set role = case when decision = 'approved' then 'seller' else 'customer' end,
      seller_status = decision,
      updated_at = now()
  where id = target_user;
end;
$$;

revoke all on function public.review_seller_application(uuid,text) from public, anon;
grant execute on function public.review_seller_application(uuid,text) to authenticated;
