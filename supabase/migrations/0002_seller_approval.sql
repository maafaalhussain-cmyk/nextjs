-- Admin-only seller approval RPC. Call only from an authenticated admin session.
create or replace function public.review_seller_application(application_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_user uuid;
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
  select user_id into target_user from public.seller_applications where id = application_id for update;
  if target_user is null then raise exception 'application not found'; end if;
  update public.seller_applications
    set status = decision, reviewed_at = now(), reviewed_by = (select auth.uid())
    where id = application_id;
  if decision = 'approved' then
    update public.profiles set role = 'seller', updated_at = now() where id = target_user;
  else
    update public.profiles set role = 'customer', updated_at = now() where id = target_user;
  end if;
end;
$$;
revoke all on function public.review_seller_application(uuid,text) from public;
grant execute on function public.review_seller_application(uuid,text) to authenticated;
