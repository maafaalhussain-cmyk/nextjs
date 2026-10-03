-- J&M financial ledger foundation (Saudi Riyal, integer halalas).
-- Apply only after reviewing the existing migration history in a staging Supabase project.
-- All writes must come from trusted server code after verified payment/refund webhooks.

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  source text not null check (source in ('payment','refund','payout','adjustment')),
  source_reference text not null,
  order_id uuid references public.orders(id),
  currency text not null default 'SAR' check (currency = 'SAR'),
  status text not null default 'draft' check (status in ('draft','posted','void')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (source, source_reference),
  check ((status = 'posted') = (posted_at is not null))
);

create table if not exists public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.financial_transactions(id),
  account_code text not null check (account_code in (
    'cash_clearing','customer_receivable','seller_payable',
    'platform_commission_revenue','tax_payable','shipping_payable',
    'discount_expense','refund_payable','payout_clearing','adjustment'
  )),
  side text not null check (side in ('debit','credit')),
  amount_halalas bigint not null check (amount_halalas > 0),
  seller_id uuid references public.profiles(id),
  product_id uuid references public.products(id),
  order_id uuid references public.orders(id),
  order_item_id uuid references public.order_items(id),
  created_at timestamptz not null default now()
);

create index if not exists financial_transactions_time_idx
  on public.financial_transactions(occurred_at desc) where status = 'posted';
create index if not exists financial_ledger_account_time_idx
  on public.financial_ledger_entries(account_code, created_at desc);
create index if not exists financial_ledger_seller_time_idx
  on public.financial_ledger_entries(seller_id, created_at desc);
create index if not exists financial_ledger_product_time_idx
  on public.financial_ledger_entries(product_id, created_at desc);
create index if not exists financial_ledger_order_idx
  on public.financial_ledger_entries(order_id);

alter table public.financial_transactions enable row level security;
alter table public.financial_ledger_entries enable row level security;

-- Customers and sellers cannot write financial records from the browser.
revoke all on public.financial_transactions from anon, authenticated;
revoke all on public.financial_ledger_entries from anon, authenticated;

drop policy if exists "finance admin reads transactions" on public.financial_transactions;
create policy "finance admin reads transactions" on public.financial_transactions
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  or exists (
    select 1 from public.financial_ledger_entries le
    where le.transaction_id = id and le.seller_id = (select auth.uid())
  )
);

drop policy if exists "finance admin or seller reads own ledger" on public.financial_ledger_entries;
create policy "finance admin or seller reads own ledger" on public.financial_ledger_entries
for select to authenticated using (
  seller_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

grant select on public.financial_transactions to authenticated;
grant select on public.financial_ledger_entries to authenticated;

-- Posted journal lines are append-only. Corrections must be new reversing entries.
create or replace function public.prevent_posted_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
declare target_status text;
begin
  if tg_op = 'INSERT' then
    select status into target_status
    from public.financial_transactions where id = new.transaction_id;
  else
    select status into target_status
    from public.financial_transactions where id = old.transaction_id;
  end if;
  if target_status = 'posted' then
    raise exception 'posted ledger entries are immutable; create a reversing transaction';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists financial_ledger_immutable on public.financial_ledger_entries;
create trigger financial_ledger_immutable
before insert or update or delete on public.financial_ledger_entries
for each row execute function public.prevent_posted_ledger_mutation();

-- A journal can be posted only when total debits equal total credits.
create or replace function public.assert_financial_transaction_balanced()
returns trigger language plpgsql set search_path = '' as $$
declare debit_total numeric;
declare credit_total numeric;
begin
  if new.status = 'posted' then
    if tg_op = 'INSERT' then
      raise exception 'create financial transactions as draft, add balanced entries, then post';
    end if;
    if old.status is distinct from 'posted' then
      select
        coalesce(sum(amount_halalas) filter (where side = 'debit'), 0),
        coalesce(sum(amount_halalas) filter (where side = 'credit'), 0)
      into debit_total, credit_total
      from public.financial_ledger_entries
      where transaction_id = new.id;

      if debit_total = 0 or debit_total <> credit_total then
        raise exception 'financial transaction is not balanced (debits %, credits %)',
          debit_total, credit_total;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists financial_transaction_balance_check on public.financial_transactions;
create trigger financial_transaction_balance_check
before insert or update of status on public.financial_transactions
for each row execute function public.assert_financial_transaction_balanced();

-- Minute-level Riyadh reporting base. Aggregate this view by hour/day/week/month
-- in the admin reporting API; all stored timestamps remain UTC timestamptz.
create or replace view public.financial_minute_summary
with (security_invoker = true) as
select
  date_trunc('minute', ft.occurred_at at time zone 'Asia/Riyadh') as riyadh_minute,
  le.seller_id,
  le.product_id,
  le.account_code,
  le.side,
  sum(le.amount_halalas)::bigint as amount_halalas,
  count(distinct ft.id)::bigint as transaction_count
from public.financial_transactions ft
join public.financial_ledger_entries le on le.transaction_id = ft.id
where ft.status = 'posted'
group by 1,2,3,4,5;

grant select on public.financial_minute_summary to authenticated;

comment on table public.financial_transactions is
  'Idempotent financial event header. Only trusted server code may create and post transactions.';
comment on table public.financial_ledger_entries is
  'Append-only double-entry journal. Amounts are integer halalas; every posted transaction must balance.';
comment on view public.financial_minute_summary is
  'Posted ledger totals by Riyadh minute, seller, product, account and debit/credit side.';
