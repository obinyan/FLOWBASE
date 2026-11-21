-- Apply the workspace default currency to every existing payment atomically.
-- The current user must be an active workspace owner or admin, as required by
-- private.is_admin(). Amounts are relabeled only; no conversion is performed.
create or replace function public.apply_workspace_default_currency(
  p_workspace uuid,
  p_currency text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer := 0;
begin
  if p_currency is null or p_currency not in ('USD', 'GBP', 'EUR', 'NGN') then
    raise exception 'Unsupported workspace currency.' using errcode = '22023';
  end if;

  if not private.is_admin(p_workspace) then
    raise exception 'Only workspace owners and admins can change the default currency.' using errcode = '42501';
  end if;

  update public.workspaces as w
  set currency = p_currency
  where w.id = p_workspace
    and w.currency is distinct from p_currency;

  if not exists (select 1 from public.workspaces as w where w.id = p_workspace) then
    raise exception 'Workspace not found.' using errcode = 'P0002';
  end if;

  update public.payments as p
  set currency = p_currency
  where p.workspace_id = p_workspace
    and p.currency is distinct from p_currency;
  get diagnostics v_updated = row_count;

  return v_updated;
end
$$;

revoke all on function public.apply_workspace_default_currency(uuid, text) from public, anon;
grant execute on function public.apply_workspace_default_currency(uuid, text) to authenticated;

-- Tie the automatic timeline entry to its payment so deleting a payment also
-- removes the corresponding amount from the client activity timeline.
alter table public.lead_activities
  add column if not exists payment_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lead_activities_payment_id_fkey'
      and conrelid = 'public.lead_activities'::regclass
  ) then
    alter table public.lead_activities
      add constraint lead_activities_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete cascade;
  end if;
end
$$;

create index if not exists lead_activities_payment_id_idx
  on public.lead_activities (payment_id);

-- Link existing auto-generated payment timeline rows where the trigger fields
-- match; the exact timestamp avoids associating unrelated payment notes.
update public.lead_activities as a
set payment_id = p.id
from public.payments as p
where a.payment_id is null
  and a.type = 'payment'
  and a.workspace_id = p.workspace_id
  and a.lead_id = p.lead_id
  and a.created_at = p.created_at
  and a.title = 'Payment recorded (' || p.status::text || ')'
  and a.note = coalesce(p.service, 'Payment') || ' — ' ||
    to_char(p.amount_minor / 100.0, 'FM999,999,999,990.00') || ' ' || p.currency;

create or replace function private.payments_log_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.lead_activities (workspace_id, lead_id, payment_id, type, title, note, created_by)
  values (
    new.workspace_id, new.lead_id, new.id, 'payment',
    'Payment recorded (' || new.status::text || ')',
    coalesce(new.service, 'Payment') || ' — ' ||
      to_char(new.amount_minor / 100.0, 'FM999,999,999,990.00') || ' ' || new.currency,
    new.created_by
  );
  return null;
end
$$;

-- Keep the deletion event for accountability but remove snapshots that retain
-- the deleted payment's values, including earlier currency-update snapshots.
create or replace function private.payments_redact_delete_audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.audit_events as a
  set changes = jsonb_build_object('record_redacted', true)
  where a.entity_type = 'payments'
    and a.entity_id = old.id::text;
  return old;
end
$$;

drop trigger if exists payments_redact_delete_audit on public.payments;
create trigger payments_redact_delete_audit
  after delete on public.payments
  for each row execute function private.payments_redact_delete_audit();

-- Let workspace writers remove manually managed payment records. Views remain
-- read-only, and RLS still restricts deletion to the caller's workspace.
drop policy if exists "payments: admins delete" on public.payments;
drop policy if exists "payments: writers delete" on public.payments;
create policy "payments: writers delete" on public.payments
  for delete to authenticated
  using (private.can_write(workspace_id));
