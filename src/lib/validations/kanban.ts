import { z } from 'zod'

export const columnNameSchema = z.object({
  name: z.string().trim().min(1, 'Назва не може бути порожньою').max(60, 'Максимум 60 символів'),
})

export type ColumnNameFormValues = z.infer<typeof columnNameSchema>

export const cardSchema = z.object({
  title: z.string().trim().min(1, 'Назва не може бути порожньою').max(200, 'Максимум 200 символів'),
  description: z.string().max(10000, 'Максимум 10000 символів').optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
})

export type CardFormValues = z.infer<typeof cardSchema>

export const COLUMN_COLORS = [
  '#a855f7',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#ef4444',
  '#06b6d4',
  '#6b7280',
]
