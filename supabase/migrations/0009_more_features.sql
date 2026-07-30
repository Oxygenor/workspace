-- ============================================================
-- Recurring tasks + snooze
-- ============================================================
alter table public.tasks add column recurrence text check (recurrence in ('daily', 'weekly', 'monthly'));
alter table public.tasks add column snoozed_until timestamptz;

create index idx_tasks_snoozed_until on public.tasks (snoozed_until);

-- ============================================================
-- Kanban: WIP limit per column
-- ============================================================
alter table public.kanban_columns add column wip_limit integer;

-- ============================================================
-- Notes: pin to Home + PIN-lock
-- ============================================================
alter table public.documents add column pinned boolean not null default false;
alter table public.documents add column locked boolean not null default false;
alter table public.documents add column lock_pin_hash text;

-- ============================================================
-- Attachments: allow attaching to a workspace item (e.g. a note's
-- voice memo), not just a kanban card. workspace_id is already a
-- direct column here, so existing RLS policies cover both cases
-- unchanged.
-- ============================================================
alter table public.attachments add column item_id uuid references public.workspace_items (id) on delete cascade;
alter table public.attachments drop constraint if exists attachments_single_target;
alter table public.attachments add constraint attachments_single_target check (num_nonnulls(card_id, item_id) = 1);

create index idx_attachments_item_id on public.attachments (item_id);

-- ============================================================
-- Task lists: custom fields (mirrors table_columns/table_cells)
-- ============================================================
create table public.task_custom_fields (
  id uuid primary key default gen_random_uuid(),
  task_list_id uuid not null references public.workspace_items (id) on delete cascade,
  name text not null,
  field_type public.table_field_type not null default 'text',
  settings jsonb not null default '{}'::jsonb,
  position numeric not null default 1000
);

create index idx_task_custom_fields_task_list_position on public.task_custom_fields (task_list_id, position);

create table public.task_field_values (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  field_id uuid not null references public.task_custom_fields (id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),
  unique (task_id, field_id)
);

create index idx_task_field_values_task_id on public.task_field_values (task_id);
create index idx_task_field_values_field_id on public.task_field_values (field_id);

alter table public.task_custom_fields enable row level security;
alter table public.task_field_values enable row level security;

create policy "task_custom_fields_select_members" on public.task_custom_fields
  for select using (public.is_workspace_member(public.item_workspace_id(task_list_id)));

create policy "task_custom_fields_insert_editors" on public.task_custom_fields
  for insert with check (public.can_edit_workspace(public.item_workspace_id(task_list_id)));

create policy "task_custom_fields_update_editors" on public.task_custom_fields
  for update using (public.can_edit_workspace(public.item_workspace_id(task_list_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(task_list_id)));

create policy "task_custom_fields_delete_editors" on public.task_custom_fields
  for delete using (public.can_edit_workspace(public.item_workspace_id(task_list_id)));

create policy "task_field_values_select_members" on public.task_field_values
  for select using (public.is_workspace_member(public.task_workspace_id(task_id)));

create policy "task_field_values_insert_editors" on public.task_field_values
  for insert with check (public.can_edit_workspace(public.task_workspace_id(task_id)));

create policy "task_field_values_update_editors" on public.task_field_values
  for update using (public.can_edit_workspace(public.task_workspace_id(task_id)))
  with check (public.can_edit_workspace(public.task_workspace_id(task_id)));

create policy "task_field_values_delete_editors" on public.task_field_values
  for delete using (public.can_edit_workspace(public.task_workspace_id(task_id)));

-- ============================================================
-- Reading list ("read later") module type
-- ============================================================
alter type public.item_type add value if not exists 'reading_list';

create table public.reading_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.workspace_items (id) on delete cascade,
  url text not null,
  title text,
  favicon_url text,
  is_read boolean not null default false,
  position numeric not null default 1000,
  created_at timestamptz not null default now()
);

create index idx_reading_list_items_list_position on public.reading_list_items (list_id, position);

alter table public.reading_list_items enable row level security;

create policy "reading_list_items_select_members" on public.reading_list_items
  for select using (public.is_workspace_member(public.item_workspace_id(list_id)));

create policy "reading_list_items_insert_editors" on public.reading_list_items
  for insert with check (public.can_edit_workspace(public.item_workspace_id(list_id)));

create policy "reading_list_items_update_editors" on public.reading_list_items
  for update using (public.can_edit_workspace(public.item_workspace_id(list_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(list_id)));

create policy "reading_list_items_delete_editors" on public.reading_list_items
  for delete using (public.can_edit_workspace(public.item_workspace_id(list_id)));
