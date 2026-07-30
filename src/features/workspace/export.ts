import type { PostgrestError } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type {
  AttachmentRow,
  CalendarEventRow,
  CardLabelRow,
  ChecklistItemRow,
  CommentRow,
  DocumentRow,
  KanbanCardRow,
  KanbanColumnRow,
  LabelRow,
  TableCellRow,
  TableColumnRow,
  TableRowRow,
  TagLinkRow,
  TagRow,
  TaskRow,
  WorkspaceItemRow,
  WorkspaceRow,
} from '@/types/database'

export interface WorkspaceExport {
  exportedAt: string
  workspace: WorkspaceRow
  items: WorkspaceItemRow[]
  kanbanColumns: KanbanColumnRow[]
  kanbanCards: KanbanCardRow[]
  labels: LabelRow[]
  cardLabels: CardLabelRow[]
  checklistItems: ChecklistItemRow[]
  comments: CommentRow[]
  attachments: AttachmentRow[]
  documents: DocumentRow[]
  tableColumns: TableColumnRow[]
  tableRows: TableRowRow[]
  tableCells: TableCellRow[]
  tasks: TaskRow[]
  calendarEvents: CalendarEventRow[]
  tags: TagRow[]
  tagLinks: TagLinkRow[]
}

async function fetchAll<T>(
  query: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  fallback = 'Не вдалося зібрати дані для експорту.',
): Promise<T[]> {
  return throwIfError(await query, fallback)
}

export async function buildWorkspaceExport(workspace: WorkspaceRow): Promise<WorkspaceExport> {
  const [activeItems, archivedItems] = await Promise.all([
    fetchAll<WorkspaceItemRow>(supabase.from('workspace_items').select('*').eq('workspace_id', workspace.id).is('archived_at', null)),
    fetchAll<WorkspaceItemRow>(supabase.from('workspace_items').select('*').eq('workspace_id', workspace.id).not('archived_at', 'is', null)),
  ])
  const items = [...activeItems, ...archivedItems]

  const boardIds = items.filter((i) => i.type === 'kanban').map((i) => i.id)
  const tableIds = items.filter((i) => i.type === 'table').map((i) => i.id)
  const taskListIds = items.filter((i) => i.type === 'task_list').map((i) => i.id)
  const calendarIds = items.filter((i) => i.type === 'calendar').map((i) => i.id)
  const noteIds = items.filter((i) => i.type === 'notes').map((i) => i.id)

  const [kanbanColumns, kanbanCards, labels, tableColumns, tableRows, tasks, calendarEvents, documents, attachments, tags] =
    await Promise.all([
      boardIds.length ? fetchAll<KanbanColumnRow>(supabase.from('kanban_columns').select('*').in('board_id', boardIds)) : [],
      boardIds.length ? fetchAll<KanbanCardRow>(supabase.from('kanban_cards').select('*').in('board_id', boardIds)) : [],
      boardIds.length ? fetchAll<LabelRow>(supabase.from('labels').select('*').in('board_id', boardIds)) : [],
      tableIds.length ? fetchAll<TableColumnRow>(supabase.from('table_columns').select('*').in('table_id', tableIds)) : [],
      tableIds.length ? fetchAll<TableRowRow>(supabase.from('table_rows').select('*').in('table_id', tableIds)) : [],
      taskListIds.length ? fetchAll<TaskRow>(supabase.from('tasks').select('*').in('task_list_id', taskListIds)) : [],
      calendarIds.length ? fetchAll<CalendarEventRow>(supabase.from('calendar_events').select('*').in('calendar_id', calendarIds)) : [],
      noteIds.length ? fetchAll<DocumentRow>(supabase.from('documents').select('*').in('item_id', noteIds)) : [],
      fetchAll<AttachmentRow>(supabase.from('attachments').select('*').eq('workspace_id', workspace.id)),
      fetchAll<TagRow>(supabase.from('tags').select('*').eq('workspace_id', workspace.id)),
    ])

  const cardIds = kanbanCards.map((c) => c.id)
  const rowIds = tableRows.map((r) => r.id)
  const tagIds = tags.map((tg) => tg.id)

  const [cardLabels, checklistItems, comments, tableCells, tagLinks] = await Promise.all([
    cardIds.length ? fetchAll<CardLabelRow>(supabase.from('card_labels').select('*').in('card_id', cardIds)) : [],
    cardIds.length ? fetchAll<ChecklistItemRow>(supabase.from('checklist_items').select('*').in('card_id', cardIds)) : [],
    cardIds.length ? fetchAll<CommentRow>(supabase.from('comments').select('*').in('card_id', cardIds)) : [],
    rowIds.length ? fetchAll<TableCellRow>(supabase.from('table_cells').select('*').in('row_id', rowIds)) : [],
    tagIds.length ? fetchAll<TagLinkRow>(supabase.from('tag_links').select('*').in('tag_id', tagIds)) : [],
  ])

  return {
    exportedAt: new Date().toISOString(),
    workspace,
    items,
    kanbanColumns,
    kanbanCards,
    labels,
    cardLabels,
    checklistItems,
    comments,
    attachments,
    documents,
    tableColumns,
    tableRows,
    tableCells,
    tasks,
    calendarEvents,
    tags,
    tagLinks,
  }
}

export function downloadWorkspaceExport(data: WorkspaceExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const datePart = data.exportedAt.slice(0, 10)
  link.href = url
  link.download = `workspace-backup-${data.workspace.name.replace(/[^a-zA-Zа-яА-ЯіїєІЇЄ0-9]+/g, '-')}-${datePart}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
