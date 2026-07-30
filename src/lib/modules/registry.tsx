import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'

import { ICON_MAP } from './icon-map'
import type { ItemType, WorkspaceItemRow } from '@/types/database'

export interface ModuleComponentProps {
  item: WorkspaceItemRow
}

export interface ModuleDefinition {
  type: ItemType
  title: string
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType<ModuleComponentProps>>
}

/**
 * Central registry of workspace-item modules. To add a new module type,
 * add one entry here (and to the `ItemType`/enum + create-menu list) —
 * the tree, breadcrumbs and item router never need to change.
 */
export const moduleRegistry: Partial<Record<ItemType, ModuleDefinition>> = {
  kanban: {
    type: 'kanban',
    title: 'Канбан-дошка',
    icon: ICON_MAP.KanbanSquare,
    component: lazy(() => import('@/features/kanban/pages/KanbanPage').then((m) => ({ default: m.KanbanPage }))),
  },
  notes: {
    type: 'notes',
    title: 'Нотатка',
    icon: ICON_MAP.FileText,
    component: lazy(() => import('@/features/notes/pages/NotesPage').then((m) => ({ default: m.NotesPage }))),
  },
  table: {
    type: 'table',
    title: 'Таблиця',
    icon: ICON_MAP.Table,
    component: lazy(() => import('@/features/tables/pages/TablePage').then((m) => ({ default: m.TablePage }))),
  },
  task_list: {
    type: 'task_list',
    title: 'Список завдань',
    icon: ICON_MAP.ListTodo,
    component: lazy(() => import('@/features/tasks/pages/TaskListPage').then((m) => ({ default: m.TaskListPage }))),
  },
  calendar: {
    type: 'calendar',
    title: 'Календар',
    icon: ICON_MAP.Calendar,
    component: lazy(() => import('@/features/calendar/pages/CalendarPage').then((m) => ({ default: m.CalendarPage }))),
  },
}
