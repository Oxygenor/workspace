import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { TableColumnRow } from '@/types/database'
import { getColumnOptions } from '../types'
import { useUpsertCell } from '../hooks'

const NONE_VALUE = '__none__'

const plainInputClassName =
  'h-8 w-full min-w-0 rounded border border-transparent bg-transparent px-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-input focus:border-input focus:bg-background focus:shadow-sm'

interface TableCellProps {
  tableId: string
  rowId: string
  column: TableColumnRow
  value: unknown
}

export function TableCell({ tableId, rowId, column, value }: TableCellProps) {
  const upsertCell = useUpsertCell(tableId)

  function commit(next: unknown) {
    upsertCell.mutate({ rowId, columnId: column.id, value: next })
  }

  switch (column.field_type) {
    case 'text':
      return <TextCell value={typeof value === 'string' ? value : ''} onCommit={commit} />
    case 'number':
      return <NumberCell value={typeof value === 'number' ? value : null} onCommit={commit} />
    case 'date':
      return <DateCell value={typeof value === 'string' ? value : ''} onCommit={commit} />
    case 'checkbox':
      return <CheckboxCell value={value === true} onCommit={commit} />
    case 'url':
      return <UrlCell value={typeof value === 'string' ? value : ''} onCommit={commit} />
    case 'select':
    case 'status':
      return (
        <SelectCell
          fieldType={column.field_type}
          value={typeof value === 'string' ? value : null}
          options={getColumnOptions(column.settings)}
          onCommit={commit}
        />
      )
  }
}

function TextCell({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const debouncedCommit = useDebouncedCallback(onCommit, 600)

  return (
    <input
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        debouncedCommit(e.target.value)
      }}
      className={plainInputClassName}
    />
  )
}

function NumberCell({ value, onCommit }: { value: number | null; onCommit: (v: number | null) => void }) {
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
      className={plainInputClassName}
    />
  )
}

function DateCell({ value, onCommit }: { value: string; onCommit: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onCommit(e.target.value === '' ? null : e.target.value)}
      className={plainInputClassName}
    />
  )
}

function CheckboxCell({ value, onCommit }: { value: boolean; onCommit: (v: boolean) => void }) {
  return (
    <div className="flex h-8 items-center px-2">
      <Checkbox checked={value} onCheckedChange={(checked) => onCommit(checked === true)} />
    </div>
  )
}

function UrlCell({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const debouncedCommit = useDebouncedCallback(onCommit, 600)

  if (!isFocused && draft) {
    return (
      <button
        type="button"
        onClick={() => setIsFocused(true)}
        className="flex h-8 w-full min-w-0 items-center gap-1 rounded border border-transparent px-2 text-left text-sm hover:border-input"
      >
        <a
          href={/^https?:\/\//i.test(draft) ? draft : `https://${draft}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="truncate text-primary underline-offset-2 hover:underline"
        >
          {draft}
        </a>
        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>
    )
  }

  return (
    <input
      autoFocus={isFocused}
      value={draft}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value)
        debouncedCommit(e.target.value)
      }}
      className={plainInputClassName}
    />
  )
}

function SelectCell({
  fieldType,
  value,
  options,
  onCommit,
}: {
  fieldType: 'select' | 'status'
  value: string | null
  options: { value: string; label: string; color: string }[]
  onCommit: (v: string | null) => void
}) {
  const selected = value ? options.find((option) => option.value === value) : undefined

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(next) => onCommit(next === NONE_VALUE ? null : next)}
    >
      <SelectTrigger className="h-8 border-transparent bg-transparent px-2 shadow-none hover:border-input focus:border-input">
        {fieldType === 'status' ? (
          <SelectValue placeholder={t.common.none}>
            {selected && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
                {selected.label}
              </span>
            )}
          </SelectValue>
        ) : (
          <SelectValue placeholder={t.common.none} />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE} className={cn('text-muted-foreground')}>
          {t.common.none}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {fieldType === 'status' ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                {option.label}
              </span>
            ) : (
              option.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
