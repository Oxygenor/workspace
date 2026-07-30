import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { nextAppendPosition, computeGapPosition } from '@/lib/position'
import { t } from '@/i18n'
import { useKanbanFiltersStore } from '@/stores/kanban-filters-store'
import type { KanbanColumnRow } from '@/types/database'
import { EMPTY_FILTERS } from '../types'
import type { KanbanCardSummary } from '../types'
import { applyCardFilters, sortCards } from '../filter-utils'
import {
  useColumns,
  useCreateColumn,
  useKanbanCards,
  useMoveCard,
  useReorderCard,
  useReorderColumn,
} from '../hooks'
import { ColumnDropGap } from './ColumnDropGap'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCardPreview } from './KanbanCardPreview'

interface KanbanBoardProps {
  boardId: string
  onOpenCard: (cardId: string) => void
}

type DragItem =
  | { kind: 'card'; card: KanbanCardSummary }
  | { kind: 'column'; column: KanbanColumnRow }

export function KanbanBoard({ boardId, onOpenCard }: KanbanBoardProps) {
  const { data: columns, isLoading: columnsLoading } = useColumns(boardId)
  const { data: cards, isLoading: cardsLoading } = useKanbanCards(boardId)
  const createColumn = useCreateColumn(boardId)
  const reorderColumn = useReorderColumn(boardId)
  const reorderCard = useReorderCard(boardId)
  const moveCard = useMoveCard(boardId)

  const filters = useKanbanFiltersStore((s) => s.filtersByBoard[boardId] ?? EMPTY_FILTERS)
  const search = useKanbanFiltersStore((s) => s.searchByBoard[boardId] ?? '')
  const sort = useKanbanFiltersStore((s) => s.sortByBoard[boardId] ?? 'manual')

  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)

  const cardsByColumn = useMemo(() => {
    const filtered = applyCardFilters(cards ?? [], filters, search)
    const map = new Map<string, KanbanCardSummary[]>()
    for (const card of filtered) {
      const list = map.get(card.column_id) ?? []
      list.push(card)
      map.set(card.column_id, list)
    }
    for (const [columnId, list] of map) {
      map.set(columnId, sortCards(list, sort))
    }
    return map
  }, [cards, filters, search, sort])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragStart(event: DragStartEvent) {
    setActiveItem((event.active.data.current as DragItem | undefined) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as DragItem | undefined
    if (!activeData) return

    const overData = over.data.current as
      | { kind: 'card-gap'; columnId: string; beforeId: string | null; afterId: string | null }
      | { kind: 'column-gap'; beforeId: string | null; afterId: string | null }
      | undefined
    if (!overData) return

    if (activeData.kind === 'column' && overData.kind === 'column-gap') {
      const allColumns = columns ?? []
      const before = overData.beforeId ? allColumns.find((c) => c.id === overData.beforeId) : null
      const after = overData.afterId ? allColumns.find((c) => c.id === overData.afterId) : null
      const position = computeGapPosition(before?.position ?? null, after?.position ?? null)
      if (position !== activeData.column.position) {
        reorderColumn.mutate({ columnId: activeData.column.id, position })
      }
      return
    }

    if (activeData.kind === 'card' && overData.kind === 'card-gap') {
      const card = activeData.card
      const columnCards = cardsByColumn.get(overData.columnId) ?? []
      const before = overData.beforeId ? columnCards.find((c) => c.id === overData.beforeId) : null
      const after = overData.afterId ? columnCards.find((c) => c.id === overData.afterId) : null
      const position = computeGapPosition(before?.position ?? null, after?.position ?? null)

      if (card.column_id === overData.columnId) {
        if (position !== card.position) {
          reorderCard.mutate({ cardId: card.id, position })
        }
      } else {
        moveCard.mutate({ cardId: card.id, newColumnId: overData.columnId, newPosition: position })
      }
      return
    }

    toast.error(t.tree.invalidDropNotSection)
  }

  function handleCreateColumn() {
    const trimmed = newColumnName.trim()
    if (!trimmed) {
      setIsAddingColumn(false)
      return
    }
    createColumn.mutate({ name: trimmed, position: nextAppendPosition(columns ?? []) })
    setNewColumnName('')
    setIsAddingColumn(false)
  }

  if (columnsLoading || cardsLoading) {
    return (
      <div className="flex gap-3">
        <Skeleton className="h-96 w-72 shrink-0" />
        <Skeleton className="h-96 w-72 shrink-0" />
        <Skeleton className="h-96 w-72 shrink-0" />
      </div>
    )
  }

  const orderedColumns = columns ?? []

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full items-start gap-0 overflow-x-auto pb-4">
        <ColumnDropGap beforeId={null} afterId={orderedColumns[0]?.id ?? null} />
        {orderedColumns.map((column, index) => (
          <div key={column.id} className="flex items-stretch gap-0">
            <KanbanColumn
              column={column}
              cards={cardsByColumn.get(column.id) ?? []}
              boardId={boardId}
              onOpenCard={onOpenCard}
            />
            <ColumnDropGap beforeId={column.id} afterId={orderedColumns[index + 1]?.id ?? null} />
          </div>
        ))}

        <div className="w-64 shrink-0 px-1">
          {isAddingColumn ? (
            <Input
              autoFocus
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder={t.kanban.columnNamePlaceholder}
              onBlur={handleCreateColumn}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateColumn()
                if (e.key === 'Escape') setIsAddingColumn(false)
              }}
            />
          ) : (
            <Button variant="outline" className="w-full justify-start" onClick={() => setIsAddingColumn(true)}>
              <Plus className="h-4 w-4" />
              {t.kanban.addColumn}
            </Button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeItem?.kind === 'card' && (
          <div className="w-64">
            <KanbanCardPreview card={activeItem.card} boardId={boardId} onOpen={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
