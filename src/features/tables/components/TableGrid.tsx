import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Sigma } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { computeGapPosition, nextAppendPosition } from '@/lib/position'
import { t } from '@/i18n'
import type { TableCellRow, TableColumnRow, TableFieldType, TableRowRow } from '@/types/database'
import {
  useCreateColumn,
  useCreateRow,
  useReorderColumn,
  useReorderRow,
  useTableCells,
  useTableColumns,
  useTableRows,
  useUpdateColumnSettings,
} from '../hooks'
import { fieldTypeLabel, formulaLabel, getColumnFormula, getFormulaOptionsForFieldType, FIELD_TYPES } from '../types'
import { TableColumnHeader } from './TableColumnHeader'
import { TableDataRow } from './TableDataRow'

function isNonEmptyValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ''
}

function toNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function roundDisplay(value: number): string {
  return String(Math.round(value * 100) / 100)
}

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
  const updateColumnSettings = useUpdateColumnSettings(tableId)

  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [pendingFieldType, setPendingFieldType] = useState<TableFieldType>('text')
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

  const footerValues = useMemo(() => {
    const map = new Map<string, string>()
    for (const column of columns ?? []) {
      const formula = getColumnFormula(column.settings)
      if (formula === 'none') continue

      const values = (rows ?? []).map((row) => cellsByRowId.get(row.id)?.get(column.id)?.value)

      if (formula === 'count') {
        map.set(column.id, String(values.filter(isNonEmptyValue).length))
        continue
      }

      const numbers = values.map(toNumericValue).filter((n): n is number => n !== null)
      if (formula === 'sum') {
        map.set(column.id, roundDisplay(numbers.reduce((acc, n) => acc + n, 0)))
      } else if (formula === 'avg' && numbers.length > 0) {
        map.set(column.id, roundDisplay(numbers.reduce((acc, n) => acc + n, 0) / numbers.length))
      }
    }
    return map
  }, [columns, rows, cellsByRowId])

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

  function startAddingColumn(fieldType: TableFieldType) {
    setPendingFieldType(fieldType)
    setIsAddingColumn(true)
  }

  function commitCreateColumn() {
    const trimmed = newColumnName.trim()
    createColumn.mutate({
      name: trimmed || fieldTypeLabel(pendingFieldType),
      fieldType: pendingFieldType,
      position: nextAppendPosition(columns ?? []),
    })
    setNewColumnName('')
    setIsAddingColumn(false)
  }

  function cancelAddingColumn() {
    setNewColumnName('')
    setIsAddingColumn(false)
  }

  function handleCreateRow() {
    createRow.mutate(nextAppendPosition(rows ?? []))
  }

  function setColumnFormula(column: TableColumnRow, formula: ReturnType<typeof getColumnFormula>) {
    updateColumnSettings.mutate({ columnId: column.id, settings: { ...column.settings, formula } })
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
  const hasAnyFormula = orderedColumns.some((column) => getColumnFormula(column.settings) !== 'none')

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
              <th className="border-b border-border p-1.5 align-middle">
                {isAddingColumn ? (
                  <Input
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder={fieldTypeLabel(pendingFieldType)}
                    onBlur={commitCreateColumn}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitCreateColumn()
                      if (e.key === 'Escape') cancelAddingColumn()
                    }}
                    className="h-7 w-40 text-sm font-normal"
                  />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="whitespace-nowrap font-normal text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t.table.addColumn}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {FIELD_TYPES.map((fieldType) => (
                        <DropdownMenuItem key={fieldType} onSelect={() => startAddingColumn(fieldType)}>
                          {fieldTypeLabel(fieldType)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                {orderedRows.map((row, index) => (
                  <TableDataRow
                    key={row.id}
                    tableId={tableId}
                    row={row}
                    columns={orderedColumns}
                    cellsByColumnId={cellsByRowId.get(row.id) ?? new Map()}
                    isLastRow={index === orderedRows.length - 1}
                    onCreateRow={handleCreateRow}
                  />
                ))}
              </SortableContext>
            )}
            {hasAnyFormula && (
              <tr className="border-b border-t border-border bg-muted/20">
                <td
                  className="w-14 border-r border-border p-1.5 text-center align-middle text-muted-foreground"
                  title={t.tableFormula.footerLabel}
                >
                  <Sigma className="mx-auto h-3.5 w-3.5" />
                </td>
                {orderedColumns.map((column) => {
                  const formula = getColumnFormula(column.settings)
                  const options = getFormulaOptionsForFieldType(column.field_type)
                  return (
                    <td key={column.id} className="border-r border-border p-0 align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            title={t.tableFormula.footerLabel}
                            className="flex h-8 w-full items-center px-1.5 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            {footerValues.get(column.id) ?? t.tableFormula.none}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {options.map((option) => (
                            <DropdownMenuItem
                              key={option}
                              onSelect={() => setColumnFormula(column, option)}
                              className={cn(option === formula && 'font-semibold')}
                            >
                              {formulaLabel(option)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )
                })}
              </tr>
            )}
            <tr>
              <td className="w-14 p-1 align-middle">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mx-auto flex h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleCreateRow}
                  title={t.table.addRow}
                  aria-label={t.table.addRow}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DndContext>
  )
}
