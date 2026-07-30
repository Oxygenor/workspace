import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FIELD_TYPES, fieldTypeLabel } from '@/features/tables/types'
import { nextAppendPosition } from '@/lib/position'
import { t } from '@/i18n'
import type { TableFieldType } from '@/types/database'
import { useCreateTaskCustomField, useDeleteTaskCustomField, useTaskCustomFields } from '../hooks'

interface TaskFieldsManagerProps {
  taskListId: string
}

export function TaskFieldsManager({ taskListId }: TaskFieldsManagerProps) {
  const { data: fields } = useTaskCustomFields(taskListId)
  const createField = useCreateTaskCustomField(taskListId)
  const deleteField = useDeleteTaskCustomField(taskListId)

  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState<TableFieldType>('text')

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    createField.mutate({ name: trimmed, fieldType, position: nextAppendPosition(fields ?? []) })
    setName('')
    setFieldType('text')
  }

  return (
    <div className="w-72 space-y-3">
      <div className="space-y-1">
        {(fields ?? []).length === 0 && <p className="text-xs text-muted-foreground">{t.taskFields.noFields}</p>}
        {(fields ?? []).map((field) => (
          <div key={field.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{field.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{fieldTypeLabel(field.field_type)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              title={t.taskFields.deleteField}
              onClick={() => deleteField.mutate(field.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-border pt-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.taskFields.nameLabel}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Select value={fieldType} onValueChange={(value) => setFieldType(value as TableFieldType)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {fieldTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full" onClick={handleAdd}>
          {t.taskFields.addField}
        </Button>
      </div>
    </div>
  )
}
