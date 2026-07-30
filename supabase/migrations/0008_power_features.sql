-- ============================================================
-- tasks: start date (for timeline/Gantt) + "someday/maybe" bucket
-- ============================================================
alter table public.tasks add column start_date timestamptz;
alter table public.tasks add column is_someday boolean not null default false;

-- ============================================================
-- Task dependencies ("blocked by")
-- ============================================================
create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint task_dependencies_not_self check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id)
);

create index idx_task_dependencies_task_id on public.task_dependencies (task_id);
create index idx_task_dependencies_depends_on on public.task_dependencies (depends_on_task_id);

create or replace function public.task_workspace_id(p_task_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select wi.workspace_id
  from public.tasks t
  join public.workspace_items wi on wi.id = t.task_list_id
  where t.id = p_task_id;
$$;

alter table public.task_dependencies enable row level security;

create policy "task_dependencies_select_members" on public.task_dependencies
  for select using (public.is_workspace_member(public.task_workspace_id(task_id)));

create policy "task_dependencies_insert_editors" on public.task_dependencies
  for insert with check (public.can_edit_workspace(public.task_workspace_id(task_id)));

create policy "task_dependencies_delete_editors" on public.task_dependencies
  for delete using (public.can_edit_workspace(public.task_workspace_id(task_id)));

-- ============================================================
-- Note backlinks ([[mentions]] between notes/items)
-- ============================================================
create table public.note_links (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid not null references public.workspace_items (id) on delete cascade,
  target_item_id uuid not null references public.workspace_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint note_links_not_self check (source_item_id <> target_item_id),
  unique (source_item_id, target_item_id)
);

create index idx_note_links_source on public.note_links (source_item_id);
create index idx_note_links_target on public.note_links (target_item_id);

alter table public.note_links enable row level security;

create policy "note_links_select_members" on public.note_links
  for select using (public.is_workspace_member(public.item_workspace_id(source_item_id)));

create policy "note_links_insert_editors" on public.note_links
  for insert with check (public.can_edit_workspace(public.item_workspace_id(source_item_id)));

create policy "note_links_delete_editors" on public.note_links
  for delete using (public.can_edit_workspace(public.item_workspace_id(source_item_id)));

-- ============================================================
-- Templates (section structure presets + card checklist presets)
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'template_kind') then
    create type public.template_kind as enum ('section', 'checklist');
  end if;
end
$$;

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.template_kind not null,
  name text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_templates_workspace_id on public.templates (workspace_id);

alter table public.templates enable row level security;

create policy "templates_select_members" on public.templates
  for select using (public.is_workspace_member(workspace_id));

create policy "templates_insert_editors" on public.templates
  for insert with check (public.can_edit_workspace(workspace_id));

create policy "templates_delete_editors" on public.templates
  for delete using (public.can_edit_workspace(workspace_id));

-- ============================================================
-- User integrations (Telegram digest bot + ICS calendar feed).
-- Deliberately its OWN table with strict own-row-only RLS: these
-- columns are secret capability tokens and must never be exposed
-- through the broadly-readable `profiles` table (whose SELECT policy
-- allows any authenticated user to read any profile row).
-- ============================================================
create table public.user_integrations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  telegram_chat_id text,
  ics_feed_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_user_integrations_ics_token on public.user_integrations (ics_feed_token);
create index idx_user_integrations_telegram_chat_id on public.user_integrations (telegram_chat_id);

create trigger trg_user_integrations_updated_at before update on public.user_integrations
  for each row execute function public.set_updated_at();

alter table public.user_integrations enable row level security;

create policy "user_integrations_select_own" on public.user_integrations
  for select using (user_id = auth.uid());

create policy "user_integrations_insert_own" on public.user_integrations
  for insert with check (user_id = auth.uid());

create policy "user_integrations_update_own" on public.user_integrations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create the integrations row for every new user, same as the
-- rest of the signup bootstrap in handle_new_user().
create or replace function public.handle_new_user_integrations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_integrations (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_integrations on auth.users;
create trigger on_auth_user_created_integrations
  after insert on auth.users
  for each row execute function public.handle_new_user_integrations();

-- Backfill for any users created before this migration.
insert into public.user_integrations (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Short-lived codes used to link a Telegram chat to a user account
-- (user generates a code in-app, sends "/start <code>" to the bot).
create table public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

alter table public.telegram_link_codes enable row level security;

create policy "telegram_link_codes_select_own" on public.telegram_link_codes
  for select using (user_id = auth.uid());

create policy "telegram_link_codes_insert_own" on public.telegram_link_codes
  for insert with check (user_id = auth.uid());

create policy "telegram_link_codes_delete_own" on public.telegram_link_codes
  for delete using (user_id = auth.uid());
