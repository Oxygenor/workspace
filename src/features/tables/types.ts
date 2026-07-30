import type { TableFieldType } from '@/types/database'
import { t } from '@/i18n'

export interface TableSelectOption {
  value: string
  label: string
  color: string
}

export const DEFAULT_OPTION_COLOR = '#94a3b8'

export const FIELD_TYPES: TableFieldType[] = ['text', 'number', 'date', 'checkbox', 'select', 'status', 'url']

export function fieldTypeLabel(fieldType: TableFieldType): string {
  switch (fieldType) {
    case 'text':
      return t.table.typeText
    case 'number':
      return t.table.typeNumber
    case 'date':
      return t.table.typeDate
    case 'checkbox':
      return t.table.typeCheckbox
    case 'select':
      return t.table.typeSelect
    case 'status':
      return t.table.typeStatus
    case 'url':
      return t.table.typeUrl
  }
}

export function getColumnOptions(settings: Record<string, unknown>): TableSelectOption[] {
  const options = (settings as { options?: unknown }).options
  if (!Array.isArray(options)) return []
  return options
    .filter((option): option is Record<string, unknown> => typeof option === 'object' && option !== null)
    .filter((option) => typeof option.value === 'string' && typeof option.label === 'string')
    .map((option) => ({
      value: option.value as string,
      label: option.label as string,
      color: typeof option.color === 'string' ? option.color : DEFAULT_OPTION_COLOR,
    }))
}
