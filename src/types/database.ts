export type ItemType = 'section' | 'kanban' | 'notes' | 'table' | 'task_list' | 'calendar'
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'
export type TableFieldType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'status' | 'url'

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
  start_date: string | null
  due_date: string | null
  position: number
  created_by: string | null
  archived_at: string | null
}

export interface CardAssigneeRow {
  card_id: string
  user_id: string
  created_at: string
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
  due_date: string | null
  assignee_id: string | null
  labels: string[]
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
