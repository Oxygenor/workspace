import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import type { TableColumnRow } from '@/types/database'
import { DEFAULT_OPTION_COLOR, getColumnOptions } from '../types'
import type { TableSelectOption } from '../types'
import { useUpdateColumnSettings } from '../hooks'

interface ColumnOptionsEditorProps {
  tableId: string
  column: TableColumnRow
}

export function ColumnOptionsEditor({ tableId, column }: ColumnOptionsEditorProps) {
  const updateSettings = useUpdateColumnSettings(tableId)
  const [draft, setDraft] = useState<TableSelectOption[]>(() => getColumnOptions(column.settings))

  function persist(next: TableSelectOption[]) {
    setDraft(next)
    updateSettings.mutate({ columnId: column.id, settings: { ...column.settings, options: next } })
  }

  function updateLabel(index: number, label: string) {
    setDraft((prev) => prev.map((option, i) => (i === index ? { ...option, label } : option)))
  }

  function commitLabel() {
    updateSettings.mutate({ columnId: column.id, settings: { ...column.settings, options: draft } })
  }

  function updateColor(index: number, color: string) {
    persist(draft.map((option, i) => (i === index ? { ...option, color } : option)))
  }

  function addOption() {
    persist([...draft, { value: crypto.randomUUID(), label: '', color: DEFAULT_OPTION_COLOR }])
  }

  function removeOption(index: number) {
    persist(draft.filter((_, i) => i !== index))
  }

  return (
    <div className="w-64 space-y-2">
      {draft.length === 0 && <p className="text-xs text-muted-foreground">{t.table.noOptions}</p>}
      {draft.map((option, index) => (
        <div key={option.value} className="flex items-center gap-1.5">
          <input
            type="color"
            value={option.color}
            onChange={(e) => updateColor(index, e.target.value)}
            className="h-7 w-7 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <Input
            value={option.label}
            placeholder={t.table.optionLabelPlaceholder}
            onChange={(e) => updateLabel(index, e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => e.key === 'Enter' && commitLabel()}
            className="h-7 flex-1 text-xs"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeOption(index)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={addOption}>
        <Plus className="h-3.5 w-3.5" />
        {t.table.addOption}
      </Button>
    </div>
  )
}
