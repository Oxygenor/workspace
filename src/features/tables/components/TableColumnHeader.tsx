import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { TableColumnRow } from '@/types/database'
import { FIELD_TYPES, fieldTypeLabel } from '../types'
import { useDeleteColumn, useRenameColumn, useUpdateColumnType } from '../hooks'
import { ColumnOptionsEditor } from './ColumnOptionsEditor'

interface TableColumnHeaderProps {
  column: TableColumnRow
  tableId: string
}

export function TableColumnHeader({ column, tableId }: TableColumnHeaderProps) {
  const renameColumn = useRenameColumn(tableId)
  const updateColumnType = useUpdateColumnType(tableId)
  const deleteColumn = useDeleteColumn(tableId)

  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(column.name)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { kind: 'column' as const, column },
  })

  function commitRename() {
    const trimmed = draftName.trim()
    setIsEditingName(false)
    if (trimmed && trimmed !== column.name) {
      renameColumn.mutate({ columnId: column.id, name: trimmed })
    } else {
      setDraftName(column.name)
    }
  }

  const hasOptions = column.field_type === 'select' || column.field_type === 'status'

  return (
    <th
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'min-w-40 border-b border-r border-border bg-muted/40 p-1.5 text-left align-middle font-medium',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {isEditingName ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraftName(column.name)
                setIsEditingName(false)
              }
            }}
            className="h-7 flex-1 text-sm"
          />
        ) : (
          <button
            type="button"
            className="flex-1 truncate text-left text-sm font-medium"
            onClick={() => setIsEditingName(true)}
          >
            {column.name}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditingName(true)}>{t.common.rename}</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t.table.changeType}</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {FIELD_TYPES.map((fieldType) => (
                    <DropdownMenuItem
                      key={fieldType}
                      onSelect={() => updateColumnType.mutate({ columnId: column.id, fieldType })}
                    >
                      {fieldTypeLabel(fieldType)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            {hasOptions && (
              <Popover>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>{t.table.manageOptions}</DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <ColumnOptionsEditor tableId={tableId} column={column} />
                </PopoverContent>
              </Popover>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setDeleteConfirmOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 />
              {t.table.deleteColumn}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.tree.confirmDeleteTitle}
        description={t.table.confirmDeleteColumnDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteColumn.mutate(column.id)}
      />
    </th>
  )
}
