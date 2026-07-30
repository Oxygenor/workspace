import type { ItemType, WorkspaceItemRow } from '@/types/database'

export type { ItemType }

export interface TreeItemNode extends WorkspaceItemRow {
  children: TreeItemNode[]
}

export const CREATABLE_CHILD_TYPES: ItemType[] = [
  'section',
  'kanban',
  'notes',
  'table',
  'task_list',
  'calendar',
]

export function canHaveChildren(type: ItemType): boolean {
  return type === 'section'
}
