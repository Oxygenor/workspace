import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { computeGapPosition, nextAppendPosition } from '@/lib/position'
import { t } from '@/i18n'
import type { TableCellRow, TableColumnRow, TableRowRow } from '@/types/database'
import { useCreateColumn, useCreateRow, useReorderColumn, useReorderRow, useTableCells, useTableColumns, useTableRows } from '../hooks'
import { TableColumnHeader } from './TableColumnHeader'
import { TableDataRow } from './TableDataRow'

interface TableGridProps {
  tableId: string
}

type DragItem = { kind: 'column'; column: TableColumnRow } | { kind: 'row'; row: TableRowRow }

export function TableGrid({ tableId }: TableGridProps) {
  const { data: columns, isLoading: columnsLoading } = useTableColumns(tableId)
  const { data: rows, isLoading: rowsLoading } = useTableRows(tableId)
  const { data: cells, isLoading: cellsLoading } = useTableCells(tableId)

  const createColumn = useCreateColumn(tableId)
  const createRow = useCreateRow(tableId)
  const reorderColumn = useReorderColumn(tableId)
  const reorderRow = useReorderRow(tableId)

  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const cellsByRowId = useMemo(() => {
    const map = new Map<string, Map<string, TableCellRow>>()
    for (const cell of cells ?? []) {
      const byColumn = map.get(cell.row_id) ?? new Map<string, TableCellRow>()
      byColumn.set(cell.column_id, cell)
      map.set(cell.row_id, byColumn)
    }
    return map
  }, [cells])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeData = active.data.current as DragItem | undefined
    if (!activeData) return

    if (activeData.kind === 'column') {
      const list = columns ?? []
      const ids = list.map((c) => c.id)
      const oldIndex = ids.indexOf(active.id as string)
      const newIndex = ids.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(list, oldIndex, newIndex)
      const targetIndex = reordered.findIndex((c) => c.id === active.id)
      const before = reordered[targetIndex - 1]?.position ?? null
      const after = reordered[targetIndex + 1]?.position ?? null
      const position = computeGapPosition(before, after)
      reorderColumn.mutate({ columnId: active.id as string, position })
      return
    }

    const list = rows ?? []
    const ids = list.map((r) => r.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(list, oldIndex, newIndex)
    const targetIndex = reordered.findIndex((r) => r.id === active.id)
    const before = reordered[targetIndex - 1]?.position ?? null
    const after = reordered[targetIndex + 1]?.position ?? null
    const position = computeGapPosition(before, after)
    reorderRow.mutate({ rowId: active.id as string, position })
  }

  function handleCreateColumn() {
    const trimmed = newColumnName.trim()
    if (!trimmed) {
      setIsAddingColumn(false)
      return
    }
    createColumn.mutate({ name: trimmed, fieldType: 'text', position: nextAppendPosition(columns ?? []) })
    setNewColumnName('')
    setIsAddingColumn(false)
  }

  function handleCreateRow() {
    createRow.mutate(nextAppendPosition(rows ?? []))
  }

  if (columnsLoading || rowsLoading || cellsLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  const orderedColumns = columns ?? []
  const orderedRows = rows ?? []
  const columnIds = orderedColumns.map((c) => c.id)
  const rowIds = orderedRows.map((r) => r.id)

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-14 border-b border-r border-border bg-muted/40" />
              <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                {orderedColumns.map((column) => (
                  <TableColumnHeader key={column.id} column={column} tableId={tableId} />
                ))}
              </SortableContext>
              <th className="border-b border-border bg-muted/40 p-1.5 align-middle">
                {isAddingColumn ? (
                  <Input
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder={t.table.columnName}
                    onBlur={handleCreateColumn}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateColumn()
                      if (e.key === 'Escape') setIsAddingColumn(false)
                    }}
                    className="h-7 w-40 text-sm font-normal"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="whitespace-nowrap font-normal"
                    onClick={() => setIsAddingColumn(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.table.addColumn}
                  </Button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {orderedRows.length === 0 ? (
              <tr>
                <td colSpan={orderedColumns.length + 2} className="p-6 text-center text-sm text-muted-foreground">
                  {t.table.emptyTable}
                </td>
              </tr>
            ) : (
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                {orderedRows.map((row) => (
                  <TableDataRow
                    key={row.id}
                    tableId={tableId}
                    row={row}
                    columns={orderedColumns}
                    cellsByColumnId={cellsByRowId.get(row.id) ?? new Map()}
                  />
                ))}
              </SortableContext>
            )}
            <tr>
              <td colSpan={orderedColumns.length + 2} className="p-1.5">
                <Button variant="ghost" size="sm" className="font-normal" onClick={handleCreateRow}>
                  <Plus className="h-3.5 w-3.5" />
                  {t.table.addRow}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DndContext>
  )
}
