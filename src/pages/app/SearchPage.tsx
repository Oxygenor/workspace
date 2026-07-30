import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KanbanSquare, SearchX } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/modules/icon-map'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { useCardSearch } from '@/features/search/hooks'
import { t } from '@/i18n'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { data: items, isLoading } = useWorkspaceItems()
  const { data: cardResults, isLoading: cardsLoading } = useCardSearch(debouncedQuery)
  const navigate = useNavigate()

  const setDebounced = useDebouncedCallback((value: string) => setDebouncedQuery(value), 300)

  useEffect(() => {
    setDebounced(query)
  }, [query, setDebounced])

  const itemResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []
    return (items ?? []).filter((item) => item.name.toLowerCase().includes(trimmed))
  }, [items, query])

  const hasQuery = query.trim().length > 0
  const noResults = hasQuery && itemResults.length === 0 && (cardResults?.length ?? 0) === 0

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-foreground">{t.common.search}</h1>
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.search.placeholder}
        className="h-11 text-base"
      />

      {(isLoading || cardsLoading) && hasQuery && <Skeleton className="h-16 w-full" />}

      {!isLoading && !cardsLoading && noResults && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">{t.search.noResults}</p>
        </div>
      )}

      <div className="space-y-2">
        {itemResults.map((item) => {
          const Icon = resolveIcon(item.icon, item.type)
          return (
            <Card
              key={item.id}
              className="flex cursor-pointer flex-row items-center gap-3 p-3 transition-shadow hover:shadow-md"
              onClick={() => navigate(`/app/item/${item.id}`)}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
            </Card>
          )
        })}

        {cardResults?.map((card) => (
          <Card
            key={card.id}
            className="flex cursor-pointer flex-row items-center gap-3 p-3 transition-shadow hover:shadow-md"
            onClick={() => navigate(`/app/item/${card.board_id}`)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <KanbanSquare className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              #{card.card_number} {card.title}
            </span>
          </Card>
        ))}
      </div>
    </div>
  )
}
