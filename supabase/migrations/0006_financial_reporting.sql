-- J&M finance reporting RPC. All filters are applied to posted journal transactions only.
-- Uses Riyadh local time buckets while preserving UTC timestamptz event storage.

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
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'not authorized';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'invalid report range';
  end if;

  if p_to - p_from > interval '3 years' then
    raise exception 'report range cannot exceed three years';
  end if;

  if p_granularity not in ('minute','hour','day','week','month') then
    raise exception 'invalid report granularity';
  end if;

  return query
  select
    date_trunc(p_granularity, ft.occurred_at at time zone 'Asia/Riyadh') as period_start,
    le.account_code,
    le.side,
    le.seller_id,
    le.product_id,
    sum(le.amount_halalas)::bigint as amount_halalas,
    count(distinct ft.id)::bigint as transaction_count,
    count(le.id)::bigint as entry_count
  from public.financial_transactions ft
  join public.financial_ledger_entries le on le.transaction_id = ft.id
  where ft.status = 'posted'
    and ft.occurred_at >= p_from
    and ft.occurred_at < p_to
    and (p_seller_id is null or le.seller_id = p_seller_id)
    and (p_product_id is null or le.product_id = p_product_id)
  group by 1,2,3,4,5
  order by 1,2,3,4,5;
end;
$$;

revoke all on function public.get_financial_report(timestamptz,timestamptz,text,uuid,uuid) from public, anon;
grant execute on function public.get_financial_report(timestamptz,timestamptz,text,uuid,uuid) to authenticated;

comment on function public.get_financial_report(timestamptz,timestamptz,text,uuid,uuid) is
  'Admin-only posted-ledger report grouped by Riyadh minute/hour/day/week/month, optionally filtered by seller and product.';
