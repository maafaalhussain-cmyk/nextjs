-- Security hardening: only trusted server-side admin operations may approve sellers or publish products.
drop policy if exists "profiles update own safe fields" on public.profiles;
drop policy if exists "seller manages own products" on public.products;
create policy "seller edits own unpublished products" on public.products
for update to authenticated
using (seller_id = auth.uid() and status in ('draft','pending','rejected'))
with check (seller_id = auth.uid() and status in ('draft','pending'));

-- Public profile creation is handled by the auth.users trigger, not client-side inserts.
drop policy if exists "profiles insert own" on public.profiles;

-- The two historical baseline files used different policy names. PostgreSQL
-- combines permissive policies with OR, so remove both variants before
-- installing one approval-gated seller write policy.
drop policy if exists "seller update own products" on public.products;
drop policy if exists "approved sellers create products" on public.products;
drop policy if exists "approved seller creates products" on public.products;
drop policy if exists "seller edits own unpublished products" on public.products;

create policy "approved sellers create products" on public.products
for insert to authenticated
with check (
  seller_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'seller'
      and p.seller_status = 'approved'
  )
);

create policy "seller edits own unpublished products" on public.products
for update to authenticated
using (
  seller_id = (select auth.uid())
  and status in ('draft','pending','rejected')
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'seller'
      and p.seller_status = 'approved'
  )
)
with check (
  seller_id = (select auth.uid())
  and status in ('draft','pending')
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'seller'
      and p.seller_status = 'approved'
  )
);
