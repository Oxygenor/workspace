import {
  Archive,
  Banknote,
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  CheckSquare,
  Contact,
  FileText,
  Folder,
  FolderKanban,
  FolderOpen,
  Gamepad2,
  Globe,
  Handshake,
  KanbanSquare,
  ListTodo,
  type LucideIcon,
  Rocket,
  Star,
  Table,
  Users,
} from 'lucide-react'
import type { ItemType } from '@/types/database'

export const ICON_MAP: Record<string, LucideIcon> = {
  Folder,
  FolderOpen,
  FolderKanban,
  KanbanSquare,
  FileText,
  Table,
  ListTodo,
  Calendar,
  CheckSquare,
  Star,
  Archive,
  Users,
  Contact,
  Banknote,
  BarChart3,
  Briefcase,
  Handshake,
  Rocket,
  Globe,
  BookOpen,
  Gamepad2,
}

export const ICON_PICKER_OPTIONS = Object.keys(ICON_MAP)

export const DEFAULT_TYPE_ICON: Record<ItemType, string> = {
  section: 'Folder',
  kanban: 'KanbanSquare',
  notes: 'FileText',
  table: 'Table',
  task_list: 'ListTodo',
  calendar: 'Calendar',
  reading_list: 'BookOpen',
}

export function resolveIcon(iconName: string | null | undefined, type: ItemType): LucideIcon {
  if (iconName && ICON_MAP[iconName]) {
    return ICON_MAP[iconName]
  }
  return ICON_MAP[DEFAULT_TYPE_ICON[type]]
}
