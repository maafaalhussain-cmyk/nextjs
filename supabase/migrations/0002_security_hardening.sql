-- Security hardening: only trusted server-side admin operations may approve sellers or publish products.
drop policy if exists "profiles update own safe fields" on public.profiles;
drop policy if exists "seller manages own products" on public.products;
create policy "seller edits own unpublished products" on public.products
for update to authenticated
using (seller_id = auth.uid() and status in ('draft','pending','rejected'))
with check (seller_id = auth.uid() and status in ('draft','pending'));

-- Public profile creation is handled by the auth.users trigger, not client-side inserts.
drop policy if exists "profiles insert own" on public.profiles;
