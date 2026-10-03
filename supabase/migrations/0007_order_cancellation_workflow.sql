-- J&M customer cancellation workflow with truthful automated customer messaging.
-- Payment-provider refunds must be executed by trusted server code and confirmed by a verified webhook.
-- This migration intentionally does not call an AI provider or claim that a refund has completed.

create table if not exists public.order_cancellations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  customer_id uuid not null references public.profiles(id),
  status text not null check (status in ('cancelled','refund_pending','refunded','rejected')),
  reason text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  payment_refund_reference text,
  provider_event_id text unique,
  customer_message text not null
);

create index if not exists order_cancellations_customer_time_idx
  on public.order_cancellations(customer_id, requested_at desc);

alter table public.order_cancellations enable row level security;
revoke all on public.order_cancellations from anon, authenticated;
grant select on public.order_cancellations to authenticated;

drop policy if exists "customers read own cancellation requests" on public.order_cancellations;
create policy "customers read own cancellation requests"
on public.order_cancellations for select to authenticated
using (customer_id = (select auth.uid()));

create or replace function public.request_order_cancellation(
  p_order_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_existing public.order_cancellations%rowtype;
  v_status text;
  v_message text;
  v_cancel_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and customer_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  select * into v_existing
  from public.order_cancellations
  where order_id = p_order_id;

  if found then
    return jsonb_build_object(
      'cancellation_id', v_existing.id,
      'status', v_existing.status,
      'message', v_existing.customer_message,
      'already_requested', true
    );
  end if;

  if v_order.status in ('pending','pending_payment') then
    v_status := 'cancelled';
    v_message := 'تم إلغاء طلبك بنجاح. إذا كان قد تم خصم مبلغ، فسيتم التحقق من عملية الدفع وإبلاغك بحالة الاسترداد بشكل منفصل.';
    update public.orders set status = 'cancelled' where id = p_order_id;
  elsif v_order.status = 'paid' then
    v_status := 'refund_pending';
    v_message := 'استلمنا طلب إلغاء طلبك بعد الدفع. جارٍ التحقق من إمكانية الإلغاء وتنفيذ الاسترداد مع مزود الدفع. سنؤكد لك النتيجة فور ورود التأكيد، ولم يتم تأكيد إعادة المبلغ بعد.';
  else
    v_status := 'rejected';
    v_message := 'تعذر إلغاء الطلب تلقائيًا لأن حالته الحالية لا تسمح بذلك. أحلنا طلبك لخدمة العملاء لمراجعته.';
  end if;

  insert into public.order_cancellations (
    order_id, customer_id, status, reason, customer_message
  ) values (
    p_order_id, (select auth.uid()), v_status,
    left(coalesce(p_reason, ''), 1000), v_message
  )
  returning id into v_cancel_id;

  return jsonb_build_object(
    'cancellation_id', v_cancel_id,
    'status', v_status,
    'message', v_message,
    'already_requested', false
  );
end;
$$;

revoke all on function public.request_order_cancellation(uuid,text) from public, anon;
grant execute on function public.request_order_cancellation(uuid,text) to authenticated;

-- Called only by trusted backend code after a verified provider refund webhook.
-- p_provider_event_id makes webhook retries idempotent.
create or replace function public.confirm_order_cancellation_refund(
  p_order_id uuid,
  p_provider_event_id text,
  p_refund_reference text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cancel public.order_cancellations%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if coalesce(p_provider_event_id, '') = '' or coalesce(p_refund_reference, '') = '' then
    raise exception 'provider event and refund references are required';
  end if;

  select * into v_cancel
  from public.order_cancellations
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'cancellation request not found';
  end if;

  if v_cancel.status = 'refunded' then
    return;
  end if;

  if v_cancel.status <> 'refund_pending' then
    raise exception 'cancellation is not awaiting refund';
  end if;

  update public.order_cancellations
  set status = 'refunded',
      completed_at = now(),
      provider_event_id = p_provider_event_id,
      payment_refund_reference = p_refund_reference,
      customer_message = 'تم تأكيد استرداد مبلغ طلبك من مزود الدفع. قد يستغرق ظهور المبلغ في حسابك وقتًا إضافيًا حسب البنك أو وسيلة الدفع.'
  where order_id = p_order_id;

  update public.orders set status = 'refunded' where id = p_order_id;
end;
$$;

revoke all on function public.confirm_order_cancellation_refund(uuid,text,text) from public, anon, authenticated;
grant execute on function public.confirm_order_cancellation_refund(uuid,text,text) to service_role;

comment on table public.order_cancellations is
  'Customer cancellation requests, status and auditable truthful response messages. Refund completion requires a verified payment-provider webhook.';
comment on function public.request_order_cancellation(uuid,text) is
  'Customer-owned order cancellation request. Cancels unpaid orders immediately; paid orders enter refund_pending pending trusted provider processing.';
