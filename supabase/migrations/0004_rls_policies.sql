-- ============================================================
-- Enable Row Level Security everywhere
-- ============================================================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_items enable row level security;
alter table public.favorites enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;
alter table public.card_assignees enable row level security;
alter table public.labels enable row level security;
alter table public.card_labels enable row level security;
alter table public.checklist_items enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.documents enable row level security;
alter table public.table_columns enable row level security;
alter table public.table_rows enable row level security;
alter table public.table_cells enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.activity_log enable row level security;

-- ============================================================
-- profiles
-- ============================================================
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================
-- workspaces
-- ============================================================
create policy "workspaces_select_members" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_insert_own" on public.workspaces
  for insert with check (owner_id = auth.uid());

create policy "workspaces_update_managers" on public.workspaces
  for update using (public.can_manage_workspace(id)) with check (public.can_manage_workspace(id));

create policy "workspaces_delete_owner" on public.workspaces
  for delete using (public.is_workspace_owner(id));

-- ============================================================
-- workspace_members
-- ============================================================
create policy "workspace_members_select_members" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_managers" on public.workspace_members
  for insert with check (
    public.can_manage_workspace(workspace_id)
    and (role <> 'owner' or public.is_workspace_owner(workspace_id))
  );

create policy "workspace_members_update_managers" on public.workspace_members
  for update using (public.can_manage_workspace(workspace_id))
  with check (
    public.can_manage_workspace(workspace_id)
    and (role <> 'owner' or public.is_workspace_owner(workspace_id))
  );

create policy "workspace_members_delete_managers" on public.workspace_members
  for delete using (
    public.can_manage_workspace(workspace_id)
    and (role <> 'owner' or public.is_workspace_owner(workspace_id))
  );

-- ============================================================
-- workspace_items
-- ============================================================
create policy "workspace_items_select_members" on public.workspace_items
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace_items_insert_editors" on public.workspace_items
  for insert with check (public.can_edit_workspace(workspace_id));

create policy "workspace_items_update_editors" on public.workspace_items
  for update using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));

create policy "workspace_items_delete_editors" on public.workspace_items
  for delete using (public.can_edit_workspace(workspace_id));

-- ============================================================
-- favorites
-- ============================================================
create policy "favorites_select_own" on public.favorites
  for select using (user_id = auth.uid());

create policy "favorites_insert_own" on public.favorites
  for insert with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "favorites_delete_own" on public.favorites
  for delete using (user_id = auth.uid());

-- ============================================================
-- kanban_columns
-- ============================================================
create policy "kanban_columns_select_members" on public.kanban_columns
  for select using (public.is_workspace_member(public.item_workspace_id(board_id)));

create policy "kanban_columns_insert_editors" on public.kanban_columns
  for insert with check (public.can_edit_workspace(public.item_workspace_id(board_id)));

create policy "kanban_columns_update_editors" on public.kanban_columns
  for update using (public.can_edit_workspace(public.item_workspace_id(board_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(board_id)));

create policy "kanban_columns_delete_editors" on public.kanban_columns
  for delete using (public.can_edit_workspace(public.item_workspace_id(board_id)));

-- ============================================================
-- kanban_cards
-- ============================================================
create policy "kanban_cards_select_members" on public.kanban_cards
  for select using (public.is_workspace_member(public.item_workspace_id(board_id)));

create policy "kanban_cards_insert_editors" on public.kanban_cards
  for insert with check (public.can_edit_workspace(public.item_workspace_id(board_id)));

create policy "kanban_cards_update_editors" on public.kanban_cards
  for update using (public.can_edit_workspace(public.item_workspace_id(board_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(board_id)));

create policy "kanban_cards_delete_editors" on public.kanban_cards
  for delete using (public.can_edit_workspace(public.item_workspace_id(board_id)));

-- ============================================================
-- card_assignees
-- ============================================================
create policy "card_assignees_select_members" on public.card_assignees
  for select using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "card_assignees_insert_editors" on public.card_assignees
  for insert with check (public.can_edit_workspace(public.card_workspace_id(card_id)));

create policy "card_assignees_delete_editors" on public.card_assignees
  for delete using (public.can_edit_workspace(public.card_workspace_id(card_id)));

-- ============================================================
-- labels
-- ============================================================
create policy "labels_select_members" on public.labels
  for select using (public.is_workspace_member(public.item_workspace_id(board_id)));

create policy "labels_insert_editors" on public.labels
  for insert with check (public.can_edit_workspace(public.item_workspace_id(board_id)));

create policy "labels_update_editors" on public.labels
  for update using (public.can_edit_workspace(public.item_workspace_id(board_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(board_id)));

create policy "labels_delete_editors" on public.labels
  for delete using (public.can_edit_workspace(public.item_workspace_id(board_id)));

-- ============================================================
-- card_labels
-- ============================================================
create policy "card_labels_select_members" on public.card_labels
  for select using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "card_labels_insert_editors" on public.card_labels
  for insert with check (public.can_edit_workspace(public.card_workspace_id(card_id)));

create policy "card_labels_delete_editors" on public.card_labels
  for delete using (public.can_edit_workspace(public.card_workspace_id(card_id)));

-- ============================================================
-- checklist_items
-- ============================================================
create policy "checklist_items_select_members" on public.checklist_items
  for select using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "checklist_items_insert_editors" on public.checklist_items
  for insert with check (public.can_edit_workspace(public.card_workspace_id(card_id)));

create policy "checklist_items_update_editors" on public.checklist_items
  for update using (public.can_edit_workspace(public.card_workspace_id(card_id)))
  with check (public.can_edit_workspace(public.card_workspace_id(card_id)));

create policy "checklist_items_delete_editors" on public.checklist_items
  for delete using (public.can_edit_workspace(public.card_workspace_id(card_id)));

-- ============================================================
-- comments (own comment only for write/update/delete)
-- ============================================================
create policy "comments_select_members" on public.comments
  for select using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "comments_insert_editors" on public.comments
  for insert with check (
    public.can_edit_workspace(public.card_workspace_id(card_id))
    and author_id = auth.uid()
  );

create policy "comments_update_own" on public.comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "comments_delete_own" on public.comments
  for delete using (author_id = auth.uid());

-- ============================================================
-- attachments
-- ============================================================
create policy "attachments_select_members" on public.attachments
  for select using (public.is_workspace_member(workspace_id));

create policy "attachments_insert_editors" on public.attachments
  for insert with check (
    public.can_edit_workspace(workspace_id)
    and uploaded_by = auth.uid()
  );

create policy "attachments_delete_owner_or_manager" on public.attachments
  for delete using (
    uploaded_by = auth.uid() or public.can_manage_workspace(workspace_id)
  );

-- ============================================================
-- documents (notes content)
-- ============================================================
create policy "documents_select_members" on public.documents
  for select using (public.is_workspace_member(public.item_workspace_id(item_id)));

create policy "documents_insert_editors" on public.documents
  for insert with check (public.can_edit_workspace(public.item_workspace_id(item_id)));

create policy "documents_update_editors" on public.documents
  for update using (public.can_edit_workspace(public.item_workspace_id(item_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(item_id)));

create policy "documents_delete_editors" on public.documents
  for delete using (public.can_edit_workspace(public.item_workspace_id(item_id)));

-- ============================================================
-- table_columns
-- ============================================================
create policy "table_columns_select_members" on public.table_columns
  for select using (public.is_workspace_member(public.item_workspace_id(table_id)));

create policy "table_columns_insert_editors" on public.table_columns
  for insert with check (public.can_edit_workspace(public.item_workspace_id(table_id)));

create policy "table_columns_update_editors" on public.table_columns
  for update using (public.can_edit_workspace(public.item_workspace_id(table_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(table_id)));

create policy "table_columns_delete_editors" on public.table_columns
  for delete using (public.can_edit_workspace(public.item_workspace_id(table_id)));

-- ============================================================
-- table_rows
-- ============================================================
create policy "table_rows_select_members" on public.table_rows
  for select using (public.is_workspace_member(public.item_workspace_id(table_id)));

create policy "table_rows_insert_editors" on public.table_rows
  for insert with check (public.can_edit_workspace(public.item_workspace_id(table_id)));

create policy "table_rows_update_editors" on public.table_rows
  for update using (public.can_edit_workspace(public.item_workspace_id(table_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(table_id)));

create policy "table_rows_delete_editors" on public.table_rows
  for delete using (public.can_edit_workspace(public.item_workspace_id(table_id)));

-- ============================================================
-- table_cells
-- ============================================================
create policy "table_cells_select_members" on public.table_cells
  for select using (public.is_workspace_member(public.row_workspace_id(row_id)));

create policy "table_cells_insert_editors" on public.table_cells
  for insert with check (public.can_edit_workspace(public.row_workspace_id(row_id)));

create policy "table_cells_update_editors" on public.table_cells
  for update using (public.can_edit_workspace(public.row_workspace_id(row_id)))
  with check (public.can_edit_workspace(public.row_workspace_id(row_id)));

create policy "table_cells_delete_editors" on public.table_cells
  for delete using (public.can_edit_workspace(public.row_workspace_id(row_id)));

-- ============================================================
-- tasks
-- ============================================================
create policy "tasks_select_members" on public.tasks
  for select using (public.is_workspace_member(public.item_workspace_id(task_list_id)));

create policy "tasks_insert_editors" on public.tasks
  for insert with check (public.can_edit_workspace(public.item_workspace_id(task_list_id)));

create policy "tasks_update_editors" on public.tasks
  for update using (public.can_edit_workspace(public.item_workspace_id(task_list_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(task_list_id)));

create policy "tasks_delete_editors" on public.tasks
  for delete using (public.can_edit_workspace(public.item_workspace_id(task_list_id)));

-- ============================================================
-- calendar_events
-- ============================================================
create policy "calendar_events_select_members" on public.calendar_events
  for select using (public.is_workspace_member(public.item_workspace_id(calendar_id)));

create policy "calendar_events_insert_editors" on public.calendar_events
  for insert with check (public.can_edit_workspace(public.item_workspace_id(calendar_id)));

create policy "calendar_events_update_editors" on public.calendar_events
  for update using (public.can_edit_workspace(public.item_workspace_id(calendar_id)))
  with check (public.can_edit_workspace(public.item_workspace_id(calendar_id)));

create policy "calendar_events_delete_editors" on public.calendar_events
  for delete using (public.can_edit_workspace(public.item_workspace_id(calendar_id)));

-- ============================================================
-- activity_log (append-only)
-- ============================================================
create policy "activity_log_select_members" on public.activity_log
  for select using (public.is_workspace_member(workspace_id));

create policy "activity_log_insert_editors" on public.activity_log
  for insert with check (
    public.can_edit_workspace(workspace_id) and user_id = auth.uid()
  );
