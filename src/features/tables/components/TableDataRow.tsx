import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { TableCellRow, TableColumnRow, TableRowRow } from '@/types/database'
import { useDeleteRow } from '../hooks'
import { TableCell } from './TableCell'

interface TableDataRowProps {
  tableId: string
  row: TableRowRow
  columns: TableColumnRow[]
  cellsByColumnId: Map<string, TableCellRow>
  isLastRow?: boolean
  onCreateRow?: () => void
}

export function TableDataRow({ tableId, row, columns, cellsByColumnId, isLastRow, onCreateRow }: TableDataRowProps) {
  const deleteRow = useDeleteRow(tableId)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    data: { kind: 'row' as const, row },
  })

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('group border-b border-border', isDragging && 'opacity-40')}
    >
      <td className="w-14 border-r border-border p-0 align-middle">
        <div className="flex items-center justify-center gap-0.5">
          <button
            {...attributes}
            {...listeners}
            type="button"
            className="flex h-8 w-5 cursor-grab items-center justify-center text-muted-foreground"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </td>

      {columns.map((column, index) => (
        <td
          key={column.id}
          className="border-r border-border p-0 align-middle"
          onKeyDown={
            isLastRow && index === columns.length - 1
              ? (e) => {
                  if (e.key === 'Enter') onCreateRow?.()
                }
              : undefined
          }
        >
          <TableCell tableId={tableId} rowId={row.id} column={column} value={cellsByColumnId.get(column.id)?.value} />
        </td>
      ))}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.tree.confirmDeleteTitle}
        description={t.table.confirmDeleteRowDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteRow.mutate(row.id)}
      />
    </tr>
  )
}
