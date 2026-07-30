-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- workspaces
-- ============================================================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workspaces_owner_id on public.workspaces (owner_id);

-- ============================================================
-- workspace_members
-- ============================================================
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index idx_workspace_members_workspace_id on public.workspace_members (workspace_id);
create index idx_workspace_members_user_id on public.workspace_members (user_id);

-- ============================================================
-- workspace_items (recursive tree: sections + modules)
-- ============================================================
create table public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_id uuid references public.workspace_items (id) on delete cascade,
  type public.item_type not null,
  name text not null,
  icon text,
  position numeric not null default 1000,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workspace_items_workspace_id on public.workspace_items (workspace_id);
create index idx_workspace_items_parent_id on public.workspace_items (parent_id);
create index idx_workspace_items_workspace_parent_position on public.workspace_items (workspace_id, parent_id, position);
create index idx_workspace_items_name_trgm on public.workspace_items using gin (name gin_trgm_ops);

-- ============================================================
-- favorites
-- ============================================================
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.workspace_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index idx_favorites_user_id on public.favorites (user_id);

-- ============================================================
-- kanban_columns
-- ============================================================
create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.workspace_items (id) on delete cascade,
  name text not null,
  color text not null default '#a855f7',
  position numeric not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_kanban_columns_board_position on public.kanban_columns (board_id, position);

-- ============================================================
-- kanban_cards
-- ============================================================
create table public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.workspace_items (id) on delete cascade,
  column_id uuid not null references public.kanban_columns (id) on delete cascade,
  card_number bigint,
  title text not null,
  description text,
  priority public.priority_level not null default 'medium',
  start_date timestamptz,
  due_date timestamptz,
  position numeric not null default 1000,
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_kanban_cards_board_id on public.kanban_cards (board_id);
create index idx_kanban_cards_column_position on public.kanban_cards (column_id, position);
create index idx_kanban_cards_due_date on public.kanban_cards (due_date);
create index idx_kanban_cards_title_trgm on public.kanban_cards using gin (title gin_trgm_ops);

-- ============================================================
-- card_assignees
-- ============================================================
create table public.card_assignees (
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, user_id)
);

-- ============================================================
-- labels
-- ============================================================
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.workspace_items (id) on delete cascade,
  name text not null,
  color text not null default '#a855f7',
  created_at timestamptz not null default now()
);

create index idx_labels_board_id on public.labels (board_id);

-- ============================================================
-- card_labels
-- ============================================================
create table public.card_labels (
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (card_id, label_id)
);

-- ============================================================
-- checklist_items
-- ============================================================
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_checklist_items_card_position on public.checklist_items (card_id, position);

-- ============================================================
-- comments
-- ============================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comments_card_created on public.comments (card_id, created_at);

-- ============================================================
-- attachments
-- ============================================================
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  card_id uuid references public.kanban_cards (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_attachments_workspace_id on public.attachments (workspace_id);
create index idx_attachments_card_id on public.attachments (card_id);

-- ============================================================
-- documents (notes)
-- ============================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.workspace_items (id) on delete cascade,
  content text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- table_columns
-- ============================================================
create table public.table_columns (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.workspace_items (id) on delete cascade,
  name text not null,
  field_type public.table_field_type not null default 'text',
  settings jsonb not null default '{}'::jsonb,
  position numeric not null default 1000
);

create index idx_table_columns_table_position on public.table_columns (table_id, position);

-- ============================================================
-- table_rows
-- ============================================================
create table public.table_rows (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.workspace_items (id) on delete cascade,
  position numeric not null default 1000,
  created_at timestamptz not null default now()
);

create index idx_table_rows_table_position on public.table_rows (table_id, position);

-- ============================================================
-- table_cells
-- ============================================================
create table public.table_cells (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.table_rows (id) on delete cascade,
  column_id uuid not null references public.table_columns (id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),
  unique (row_id, column_id)
);

create index idx_table_cells_row_id on public.table_cells (row_id);
create index idx_table_cells_column_id on public.table_cells (column_id);

-- ============================================================
-- tasks
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_list_id uuid not null references public.workspace_items (id) on delete cascade,
  title text not null,
  description text,
  completed boolean not null default false,
  priority public.priority_level not null default 'medium',
  due_date timestamptz,
  assignee_id uuid references auth.users (id) on delete set null,
  position numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_task_list_position on public.tasks (task_list_id, position);
create index idx_tasks_due_date on public.tasks (due_date);

-- ============================================================
-- calendar_events
-- ============================================================
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.workspace_items (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  color text not null default '#a855f7',
  related_card_id uuid references public.kanban_cards (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_calendar_events_calendar_id on public.calendar_events (calendar_id);
create index idx_calendar_events_starts_at on public.calendar_events (starts_at);

-- ============================================================
-- activity_log
-- ============================================================
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_log_workspace_created on public.activity_log (workspace_id, created_at desc);
