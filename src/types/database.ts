export type ItemType = 'section' | 'kanban' | 'notes' | 'table' | 'task_list' | 'calendar' | 'reading_list'
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'
export type TableFieldType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'status' | 'url'
export type TaskRecurrence = 'daily' | 'weekly' | 'monthly'

interface Timestamped {
  created_at: string
  updated_at: string
}

export interface ProfileRow extends Timestamped {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export interface WorkspaceRow extends Timestamped {
  id: string
  name: string
  owner_id: string
}

export interface WorkspaceMemberRow {
  id: string
  workspace_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface WorkspaceItemRow extends Timestamped {
  id: string
  workspace_id: string
  parent_id: string | null
  type: ItemType
  name: string
  icon: string | null
  color: string
  position: number
  settings: Record<string, unknown>
  created_by: string | null
  archived_at: string | null
}

export interface FavoriteRow {
  id: string
  workspace_id: string
  user_id: string
  item_id: string
  created_at: string
}

export interface KanbanColumnRow extends Timestamped {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  wip_limit: number | null
  is_done_column: boolean
  auto_archive_days: number
  archived_at: string | null
}

export interface KanbanCardRow extends Timestamped {
  id: string
  board_id: string
  column_id: string
  card_number: number
  title: string
  description: string | null
  priority: PriorityLevel
  color: string | null
  start_date: string | null
  due_date: string | null
  position: number
  created_by: string | null
  column_entered_at: string
  archived_at: string | null
}

export interface LabelRow {
  id: string
  board_id: string
  name: string
  color: string
  created_at: string
}

export interface CardLabelRow {
  card_id: string
  label_id: string
}

export interface ChecklistItemRow extends Timestamped {
  id: string
  card_id: string
  title: string
  completed: boolean
  position: number
}

export interface CommentRow extends Timestamped {
  id: string
  card_id: string
  author_id: string | null
  content: string
}

export interface AttachmentRow {
  id: string
  workspace_id: string
  card_id: string | null
  item_id: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

export interface DocumentRow extends Timestamped {
  id: string
  item_id: string
  content: string
  updated_by: string | null
  pinned: boolean
  locked: boolean
  lock_pin_hash: string | null
}

export interface TableColumnRow {
  id: string
  table_id: string
  name: string
  field_type: TableFieldType
  settings: Record<string, unknown>
  position: number
}

export interface TableRowRow {
  id: string
  table_id: string
  position: number
  created_at: string
}

export interface TableCellRow {
  id: string
  row_id: string
  column_id: string
  value: unknown
  updated_at: string
}

export interface TaskRow extends Timestamped {
  id: string
  task_list_id: string
  parent_task_id: string | null
  title: string
  description: string | null
  completed: boolean
  priority: PriorityLevel
  start_date: string | null
  due_date: string | null
  assignee_id: string | null
  labels: string[]
  is_someday: boolean
  recurrence: TaskRecurrence | null
  snoozed_until: string | null
  position: number
}

export interface CalendarEventRow extends Timestamped {
  id: string
  calendar_id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  color: string
  related_card_id: string | null
  related_item_id: string | null
  reminder_minutes_before: number | null
  created_by: string | null
}

export interface ActivityLogRow {
  id: string
  workspace_id: string
  user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface TagRow {
  id: string
  workspace_id: string
  name: string
  color: string
  created_at: string
}

export interface TagLinkRow {
  id: string
  tag_id: string
  item_id: string | null
  card_id: string | null
  task_id: string | null
  created_at: string
}

export interface TimeEntryRow {
  id: string
  workspace_id: string
  user_id: string
  card_id: string | null
  task_id: string | null
  started_at: string
  ended_at: string | null
  created_at: string
}

export interface TaskDependencyRow {
  id: string
  task_id: string
  depends_on_task_id: string
  created_at: string
}

export interface NoteLinkRow {
  id: string
  source_item_id: string
  target_item_id: string
  created_at: string
}

export type TemplateKind = 'section' | 'checklist'

export interface TemplateRow {
  id: string
  workspace_id: string
  kind: TemplateKind
  name: string
  payload: Record<string, unknown>
  created_at: string
}

export interface UserIntegrationRow {
  user_id: string
  telegram_chat_id: string | null
  ics_feed_token: string
  created_at: string
  updated_at: string
}

export interface TelegramLinkCodeRow {
  code: string
  user_id: string
  created_at: string
  expires_at: string
}

export interface UserScheduleSettingsRow extends Timestamped {
  user_id: string
  work_start: string
  work_end: string
  break_start: string | null
  break_end: string | null
  timezone: string
  idle_nudge_enabled: boolean
  last_idle_nudge_at: string | null
}

export interface UserDayOffRow {
  id: string
  user_id: string
  weekday: number | null
  specific_date: string | null
  is_working: boolean
  created_at: string
}

export interface TaskCustomFieldRow {
  id: string
  task_list_id: string
  name: string
  field_type: TableFieldType
  settings: Record<string, unknown>
  position: number
}

export interface TaskFieldValueRow {
  id: string
  task_id: string
  field_id: string
  value: unknown
  updated_at: string
}

export interface ReadingListItemRow {
  id: string
  list_id: string
  url: string
  title: string | null
  favicon_url: string | null
  is_read: boolean
  position: number
  created_at: string
}
