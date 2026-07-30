import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { ItemType, WorkspaceItemRow } from '@/types/database'
import { DEFAULT_TYPE_ICON } from '@/lib/modules/icon-map'

export async function fetchWorkspaceItems(workspaceId: string): Promise<WorkspaceItemRow[]> {
  const result = await supabase
    .from('workspace_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('position', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити структуру Workspace.')
}

export async function fetchArchivedItems(workspaceId: string): Promise<WorkspaceItemRow[]> {
  const result = await supabase
    .from('workspace_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
  return throwIfError(result, 'Не вдалося завантажити архів.')
}

export async function fetchWorkspaceItem(itemId: string): Promise<WorkspaceItemRow> {
  const result = await supabase.from('workspace_items').select('*').eq('id', itemId).single()
  return throwIfError(result, 'Не вдалося завантажити елемент.')
}

interface CreateItemInput {
  workspaceId: string
  parentId: string | null
  type: ItemType
  name: string
  position: number
  createdBy: string
}

export async function createWorkspaceItem(input: CreateItemInput): Promise<WorkspaceItemRow> {
  const result = await supabase
    .from('workspace_items')
    .insert({
      workspace_id: input.workspaceId,
      parent_id: input.parentId,
      type: input.type,
      name: input.name,
      icon: DEFAULT_TYPE_ICON[input.type],
      position: input.position,
      created_by: input.createdBy,
    })
    .select('*')
    .single()

  const item = throwIfError(result, 'Не вдалося створити елемент.')

  if (item.type === 'kanban') {
    const { error } = await supabase.from('kanban_columns').insert([
      { board_id: item.id, name: 'Нові', color: '#a855f7', position: 1000 },
      { board_id: item.id, name: 'У роботі', color: '#3b82f6', position: 2000 },
      { board_id: item.id, name: 'Завершено', color: '#22c55e', position: 3000 },
    ])
    if (error) throw toAppError(error, 'Елемент створено, але не вдалося створити колонки за замовчуванням.')
  }

  if (item.type === 'notes') {
    const { error } = await supabase.from('documents').insert({ item_id: item.id, content: '' })
    if (error) throw toAppError(error, 'Елемент створено, але не вдалося ініціалізувати нотатку.')
  }

  return item
}

export async function updateItemSettings(itemId: string, settings: Record<string, unknown>): Promise<WorkspaceItemRow> {
  const result = await supabase.from('workspace_items').update({ settings }).eq('id', itemId).select('*').single()
  return throwIfError(result, 'Не вдалося зберегти налаштування елемента.')
}

export async function renameWorkspaceItem(itemId: string, name: string): Promise<WorkspaceItemRow> {
  const result = await supabase.from('workspace_items').update({ name }).eq('id', itemId).select('*').single()
  return throwIfError(result, 'Не вдалося перейменувати елемент.')
}

export async function updateItemIcon(itemId: string, icon: string): Promise<WorkspaceItemRow> {
  const result = await supabase.from('workspace_items').update({ icon }).eq('id', itemId).select('*').single()
  return throwIfError(result, 'Не вдалося змінити іконку.')
}

export async function updateItemColor(itemId: string, color: string): Promise<WorkspaceItemRow> {
  const result = await supabase.from('workspace_items').update({ color }).eq('id', itemId).select('*').single()
  return throwIfError(result, 'Не вдалося змінити колір.')
}

export async function archiveWorkspaceItem(itemId: string): Promise<WorkspaceItemRow> {
  const result = await supabase
    .from('workspace_items')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', itemId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося архівувати елемент.')
}

export async function restoreWorkspaceItem(itemId: string): Promise<WorkspaceItemRow> {
  const result = await supabase
    .from('workspace_items')
    .update({ archived_at: null })
    .eq('id', itemId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося відновити елемент.')
}

export async function deleteWorkspaceItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('workspace_items').delete().eq('id', itemId)
  if (error) throw toAppError(error, 'Не вдалося видалити елемент.')
}

export async function moveWorkspaceItem(itemId: string, newParentId: string | null, newPosition: number): Promise<void> {
  const { error } = await supabase.rpc('move_workspace_item', {
    p_item_id: itemId,
    p_new_parent_id: newParentId,
    p_new_position: newPosition,
  })
  if (error) throw toAppError(error, 'Не вдалося перемістити елемент.')
}

/**
 * Duplicates a workspace item. For sections, this recurses into the full
 * subtree so "duplicate" gives you a working clone of the whole branch
 * (e.g. a project template), not just an empty section.
 *
 * `parentIdOverride`/`isNested` are only used internally by the recursion:
 * top-level callers never pass them.
 */
export async function duplicateWorkspaceItem(
  item: WorkspaceItemRow,
  newPosition: number,
  parentIdOverride?: string | null,
): Promise<WorkspaceItemRow> {
  const isNested = parentIdOverride !== undefined
  const copy = await createWorkspaceItem({
    workspaceId: item.workspace_id,
    parentId: isNested ? parentIdOverride : item.parent_id,
    type: item.type,
    name: isNested ? item.name : `${item.name} (копія)`,
    position: newPosition,
    createdBy: item.created_by ?? '',
  })

  if (item.type === 'kanban') {
    const { data: columns, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('board_id', item.id)
      .is('archived_at', null)
      .order('position', { ascending: true })
    if (error) throw toAppError(error, 'Дошку скопійовано без колонок.')
    if (columns && columns.length > 0) {
      await supabase.from('kanban_columns').delete().eq('board_id', copy.id)
      await supabase.from('kanban_columns').insert(
        columns.map((c) => ({ board_id: copy.id, name: c.name, color: c.color, position: c.position })),
      )
    }
  }

  if (item.type === 'notes') {
    const { data: doc } = await supabase.from('documents').select('content').eq('item_id', item.id).single()
    if (doc) {
      await supabase.from('documents').update({ content: doc.content }).eq('item_id', copy.id)
    }
  }

  if (item.type === 'table') {
    const { data: columns } = await supabase
      .from('table_columns')
      .select('*')
      .eq('table_id', item.id)
      .order('position', { ascending: true })
    if (columns && columns.length > 0) {
      await supabase
        .from('table_columns')
        .insert(columns.map((c) => ({ table_id: copy.id, name: c.name, field_type: c.field_type, settings: c.settings, position: c.position })))
    }
  }

  if (item.type === 'section') {
    const { data: children, error } = await supabase
      .from('workspace_items')
      .select('*')
      .eq('parent_id', item.id)
      .is('archived_at', null)
      .order('position', { ascending: true })
    if (error) throw toAppError(error, 'Розділ скопійовано без вмісту.')

    if (children && children.length > 0) {
      let childPosition = 1000
      for (const child of children) {
        await duplicateWorkspaceItem(child, childPosition, copy.id)
        childPosition += 1000
      }
    }
  }

  return copy
}
