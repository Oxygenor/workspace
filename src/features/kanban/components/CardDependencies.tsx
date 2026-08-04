import { useMemo } from 'react'
import { Link2, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { KanbanCardSummary } from '../types'
import { useAddCardDependency, useCardDependencies, useColumns, useKanbanCards, useRemoveCardDependency } from '../hooks'

interface CardDependenciesProps {
  card: KanbanCardSummary
  boardId: string
}

export function CardDependencies({ card, boardId }: CardDependenciesProps) {
  const { data: allCards = [] } = useKanbanCards(boardId)
  const { data: columns = [] } = useColumns(boardId)
  const { data: dependencies = [] } = useCardDependencies(boardId)
  const addDependency = useAddCardDependency(boardId)
  const removeDependency = useRemoveCardDependency(boardId)

  const doneColumnIds = useMemo(
    () => new Set(columns.filter((c) => c.is_done_column).map((c) => c.id)),
    [columns],
  )

  const myDependencyIds = useMemo(
    () => new Set(dependencies.filter((dep) => dep.card_id === card.id).map((dep) => dep.depends_on_card_id)),
    [dependencies, card.id],
  )

  const blockedBy = useMemo(
    () => allCards.filter((candidate) => myDependencyIds.has(candidate.id) && !doneColumnIds.has(candidate.column_id)),
    [allCards, myDependencyIds, doneColumnIds],
  )

  const candidates = useMemo(() => allCards.filter((candidate) => candidate.id !== card.id), [allCards, card.id])

  function toggleDependency(dependsOnCardId: string, checked: boolean) {
    if (checked) {
      addDependency.mutate({ cardId: card.id, dependsOnCardId })
    } else {
      removeDependency.mutate({ cardId: card.id, dependsOnCardId })
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      {blockedBy.length > 0 && (
        <span
          className="flex h-6 items-center gap-1 rounded-full bg-amber-500/15 px-1.5 text-xs text-amber-700 dark:text-amber-400"
          title={`${t.kanban.blockedByPrefix}: ${blockedBy.map((b) => b.title).join(', ')}`}
        >
          <Lock className="h-3 w-3" />
          {t.kanban.blocked}
        </span>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6 shrink-0', myDependencyIds.size === 0 && 'opacity-0 group-hover:opacity-100')}
            title={t.kanban.dependencies}
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t.kanban.dependenciesPickerTitle}</p>
          {candidates.length === 0 && (
            <p className="text-xs text-muted-foreground">{t.kanban.noOtherCardsForDependency}</p>
          )}
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {candidates.map((candidate) => (
              <label key={candidate.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent/50">
                <Checkbox
                  checked={myDependencyIds.has(candidate.id)}
                  onCheckedChange={(checked) => toggleDependency(candidate.id, checked === true)}
                />
                <span className="truncate">{candidate.title}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
