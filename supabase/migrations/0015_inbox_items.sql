-- ============================================================
-- inbox_items: quick personal capture, not tied to any board/list.
-- Purely own-row (no workspace concept needed for a personal scratch pad).
-- ============================================================
create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_inbox_items_user_id on public.inbox_items (user_id, created_at desc);

alter table public.inbox_items enable row level security;

create policy "inbox_items_select_own" on public.inbox_items
  for select using (user_id = auth.uid());

create policy "inbox_items_insert_own" on public.inbox_items
  for insert with check (user_id = auth.uid());

create policy "inbox_items_update_own" on public.inbox_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "inbox_items_delete_own" on public.inbox_items
  for delete using (user_id = auth.uid());
