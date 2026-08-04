-- ============================================================
-- Kanban card dependencies ("blocked by"), mirroring task_dependencies.
-- Reuses the existing card_workspace_id(uuid) helper (0008_power_features.sql).
-- ============================================================
create table public.card_dependencies (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  depends_on_card_id uuid not null references public.kanban_cards (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint card_dependencies_not_self check (card_id <> depends_on_card_id),
  unique (card_id, depends_on_card_id)
);

create index idx_card_dependencies_card_id on public.card_dependencies (card_id);
create index idx_card_dependencies_depends_on on public.card_dependencies (depends_on_card_id);

alter table public.card_dependencies enable row level security;

create policy "card_dependencies_select_members" on public.card_dependencies
  for select using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "card_dependencies_insert_editors" on public.card_dependencies
  for insert with check (public.can_edit_workspace(public.card_workspace_id(card_id)));

create policy "card_dependencies_delete_editors" on public.card_dependencies
  for delete using (public.can_edit_workspace(public.card_workspace_id(card_id)));
