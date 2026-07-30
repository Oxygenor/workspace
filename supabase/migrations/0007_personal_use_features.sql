-- ============================================================
-- Per-item color (sections/projects get a default color, changeable
-- anytime, same idea as the existing per-item icon).
-- ============================================================
alter table public.workspace_items add column color text not null default '#a855f7';

-- ============================================================
-- Cross-cutting tags: one workspace-wide tag registry that can be
-- attached to a section/module, a kanban card, or a task — independent
-- of per-board kanban labels or per-task quick labels.
-- ============================================================
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#a855f7',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index idx_tags_workspace_id on public.tags (workspace_id);

create table public.tag_links (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags (id) on delete cascade,
  item_id uuid references public.workspace_items (id) on delete cascade,
  card_id uuid references public.kanban_cards (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint tag_links_single_target check (num_nonnulls(item_id, card_id, task_id) = 1),
  unique (tag_id, item_id),
  unique (tag_id, card_id),
  unique (tag_id, task_id)
);

create index idx_tag_links_tag_id on public.tag_links (tag_id);
create index idx_tag_links_item_id on public.tag_links (item_id);
create index idx_tag_links_card_id on public.tag_links (card_id);
create index idx_tag_links_task_id on public.tag_links (task_id);

create or replace function public.tag_link_workspace_id(p_item_id uuid, p_card_id uuid, p_task_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select workspace_id from public.workspace_items where id = p_item_id),
    (select wi.workspace_id from public.kanban_cards kc join public.workspace_items wi on wi.id = kc.board_id where kc.id = p_card_id),
    (select wi.workspace_id from public.tasks t join public.workspace_items wi on wi.id = t.task_list_id where t.id = p_task_id)
  );
$$;

alter table public.tags enable row level security;
alter table public.tag_links enable row level security;

create policy "tags_select_members" on public.tags
  for select using (public.is_workspace_member(workspace_id));

create policy "tags_insert_editors" on public.tags
  for insert with check (public.can_edit_workspace(workspace_id));

create policy "tags_update_editors" on public.tags
  for update using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));

create policy "tags_delete_editors" on public.tags
  for delete using (public.can_edit_workspace(workspace_id));

create policy "tag_links_select_members" on public.tag_links
  for select using (public.is_workspace_member(public.tag_link_workspace_id(item_id, card_id, task_id)));

create policy "tag_links_insert_editors" on public.tag_links
  for insert with check (public.can_edit_workspace(public.tag_link_workspace_id(item_id, card_id, task_id)));

create policy "tag_links_delete_editors" on public.tag_links
  for delete using (public.can_edit_workspace(public.tag_link_workspace_id(item_id, card_id, task_id)));

-- ============================================================
-- Time tracking: start/stop timers against a card or a task.
-- Personal data — scoped strictly to the tracking user.
-- ============================================================
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid references public.kanban_cards (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint time_entries_single_target check (num_nonnulls(card_id, task_id) = 1)
);

-- At most one running (ended_at is null) timer per user at a time.
create unique index one_running_timer_per_user on public.time_entries (user_id) where (ended_at is null);

create index idx_time_entries_user_id on public.time_entries (user_id);
create index idx_time_entries_card_id on public.time_entries (card_id);
create index idx_time_entries_task_id on public.time_entries (task_id);

alter table public.time_entries enable row level security;

create policy "time_entries_select_own" on public.time_entries
  for select using (user_id = auth.uid());

create policy "time_entries_insert_own" on public.time_entries
  for insert with check (user_id = auth.uid() and public.can_edit_workspace(workspace_id));

create policy "time_entries_update_own" on public.time_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "time_entries_delete_own" on public.time_entries
  for delete using (user_id = auth.uid());
