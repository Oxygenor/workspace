import { useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { getColumnOptions, type TableSelectOption } from '@/features/tables/types'
import { cn, openDatePicker } from '@/lib/utils'
import { t } from '@/i18n'
import type { TaskCustomFieldRow } from '@/types/database'
import { useTaskCustomFields, useTaskFieldValues, useUpsertTaskFieldValue } from '../hooks'

const NONE_VALUE = '__none__'

const controlClassName =
  'h-6 rounded border border-input bg-transparent px-1.5 text-xs text-foreground shadow-sm outline-none focus:border-ring'

interface TaskCustomFieldsProps {
  taskId: string
  taskListId: string
}

export function TaskCustomFields({ taskId, taskListId }: TaskCustomFieldsProps) {
  const { data: fields } = useTaskCustomFields(taskListId)
  const { data: values } = useTaskFieldValues(taskListId)

  if (!fields || fields.length === 0) return null

  return (
    <>
      {fields.map((field) => {
        const valueRow = values?.find((v) => v.task_id === taskId && v.field_id === field.id)
        return (
          <div key={field.id} title={field.name} className="shrink-0">
            <TaskFieldControl taskId={taskId} taskListId={taskListId} field={field} value={valueRow?.value ?? null} />
          </div>
        )
      })}
    </>
  )
}

function TaskFieldControl({
  taskId,
  taskListId,
  field,
  value,
}: {
  taskId: string
  taskListId: string
  field: TaskCustomFieldRow
  value: unknown
}) {
  const upsertValue = useUpsertTaskFieldValue(taskListId)

  function commit(next: unknown) {
    upsertValue.mutate({ taskId, fieldId: field.id, value: next })
  }

  switch (field.field_type) {
    case 'text':
    case 'url':
      return <TextControl value={typeof value === 'string' ? value : ''} onCommit={commit} />
    case 'number':
      return <NumberControl value={typeof value === 'number' ? value : null} onCommit={commit} />
    case 'date':
      return <DateControl value={typeof value === 'string' ? value : ''} onCommit={commit} />
    case 'checkbox':
      return <Checkbox checked={value === true} onCheckedChange={(checked) => commit(checked === true)} />
    case 'select':
    case 'status':
      return (
        <SelectControl
          value={typeof value === 'string' ? value : null}
          options={getColumnOptions(field.settings)}
          onCommit={commit}
        />
      )
  }
}

function TextControl({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const debouncedCommit = useDebouncedCallback(onCommit, 600)

  return (
    <input
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        debouncedCommit(e.target.value)
      }}
      className={cn(controlClassName, 'w-24')}
    />
  )
}

function NumberControl({ value, onCommit }: { value: number | null; onCommit: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const debouncedCommit = useDebouncedCallback(onCommit, 600)

  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        debouncedCommit(raw.trim() === '' ? null : Number(raw))
      }}
      className={cn(controlClassName, 'w-16')}
    />
  )
}

function DateControl({ value, onCommit }: { value: string; onCommit: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value.slice(0, 10)}
      onClick={openDatePicker}
      onChange={(e) => onCommit(e.target.value === '' ? null : e.target.value)}
      className={cn(controlClassName, 'w-32')}
    />
  )
}

function SelectControl({
  value,
  options,
  onCommit,
}: {
  value: string | null
  options: TableSelectOption[]
  onCommit: (v: string | null) => void
}) {
  return (
    <Select value={value ?? NONE_VALUE} onValueChange={(next) => onCommit(next === NONE_VALUE ? null : next)}>
      <SelectTrigger className="h-6 w-auto shrink-0 gap-1 rounded-full border-none px-2 text-xs shadow-none">
        <SelectValue placeholder={t.common.none} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE} className="text-muted-foreground">
          {t.common.none}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
