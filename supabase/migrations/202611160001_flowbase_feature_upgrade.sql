-- Flowbase feature upgrade for the normalized base schema supplied by the user.
-- Run AFTER the full Flowbase schema has been applied to an existing project.
-- Safe to rerun; this does not recreate or replace existing tables/data.

alter table public.leads
  add column if not exists archived boolean not null default false;

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

grant update (preferences) on public.profiles to authenticated;

alter table public.calendar_events
  add column if not exists external_provider text,
  add column if not exists external_event_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'calendar_events_external_uq') then
    alter table public.calendar_events
      add constraint calendar_events_external_uq unique (workspace_id, external_provider, external_event_id);
  end if;
end $$;

create table if not exists public.provider_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  account_email text not null,
  encrypted_tokens text not null,
  granted_scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.provider_connections enable row level security;
revoke all on public.provider_connections from anon, authenticated;
grant all on public.provider_connections to service_role;

create index if not exists leads_workspace_archived_idx
  on public.leads (workspace_id, archived);

-- Legacy inbox notifications are imported only by an authenticated workspace member.
-- Normal application notifications continue to be created by database triggers/server code.
create or replace function public.import_legacy_notifications(p_workspace uuid, p_items jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_item jsonb;
begin
  if not private.can_write(p_workspace) then
    raise exception 'You cannot import notifications for this workspace' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Notification import must be a JSON array' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.notifications (workspace_id, user_id, type, title, detail, href, payload, read_at, created_at)
    values (
      p_workspace, (select auth.uid()), 'legacy',
      left(coalesce(v_item->>'title', 'Flowbase update'), 240),
      left(coalesce(v_item->>'detail', ''), 2000),
      case when coalesce(v_item->>'href', '') like '/%' then v_item->>'href' else '/inbox' end,
      jsonb_build_object('legacy_id', v_item->>'id'),
      case when coalesce((v_item->>'unread')::boolean, false) then null else now() end,
      now()
    );
  end loop;
end
$$;
revoke all on function public.import_legacy_notifications(uuid, jsonb) from public, anon;
grant execute on function public.import_legacy_notifications(uuid, jsonb) to authenticated;

-- Extend Realtime for the normalized feature tables. Existing policies still control visibility.
do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array[
      'lead_activities','payments','conversations','conversation_user_state','attachments',
      'saved_analyses','workspace_members','invitations'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end
$$;
