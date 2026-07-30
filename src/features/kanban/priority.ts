import type { PriorityLevel } from '@/types/database'
import { t } from '@/i18n'

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: t.kanban.priorityLow,
  medium: t.kanban.priorityMedium,
  high: t.kanban.priorityHigh,
  critical: t.kanban.priorityCritical,
}

export const PRIORITY_CLASSES: Record<PriorityLevel, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export const PRIORITY_ORDER: PriorityLevel[] = ['low', 'medium', 'high', 'critical']
