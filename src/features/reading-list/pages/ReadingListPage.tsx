import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { nextAppendPosition } from '@/lib/position'
import type { ModuleComponentProps } from '@/lib/modules/registry'
import { t } from '@/i18n'
import { ReadingListItemRow } from '../components/ReadingListItemRow'
import { useCreateReadingListItem, useReadingListItems, useResolveReadingListItemMetadata } from '../hooks'

export function ReadingListPage({ item }: ModuleComponentProps) {
  const { data: items, isLoading } = useReadingListItems(item.id)
  const createItem = useCreateReadingListItem(item.id)
  const resolveMetadata = useResolveReadingListItemMetadata(item.id)

  const [url, setUrl] = useState('')
  // Tracks which rows currently have an in-flight metadata resolution, so the
  // "fetching…" indicator only shows while genuinely pending — a failed
  // resolution also leaves `title` null, so we can't derive this from the
  // row data alone (that would spin forever on failure).
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set())

  const { unread, read } = useMemo(() => {
    const sorted = [...(items ?? [])].sort((a, b) => a.position - b.position)
    return {
      unread: sorted.filter((row) => !row.is_read),
      read: sorted.filter((row) => row.is_read),
    }
  }, [items])

  function handleAdd() {
    const trimmed = url.trim()
    if (!trimmed) return
    setUrl('')
    createItem.mutate(
      { url: trimmed, position: nextAppendPosition(items ?? []) },
      {
        onSuccess: (created) => {
          setResolvingIds((prev) => new Set(prev).add(created.id))
          resolveMetadata.mutate(
            { itemId: created.id, url: created.url },
            {
              onSettled: () => {
                setResolvingIds((prev) => {
                  const next = new Set(prev)
                  next.delete(created.id)
                  return next
                })
              },
            },
          )
        },
      },
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.readingList.addPlaceholder}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Button variant="outline" className="h-8 shrink-0 gap-1" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          {t.readingList.add}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && unread.length === 0 && read.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">{t.readingList.empty}</p>
      )}

      {!isLoading && (unread.length > 0 || read.length > 0) && (
        <div className="space-y-0.5">
          {unread.map((row) => (
            <ReadingListItemRow key={row.id} listId={item.id} item={row} isResolving={resolvingIds.has(row.id)} />
          ))}
          {read.map((row) => (
            <ReadingListItemRow key={row.id} listId={item.id} item={row} isResolving={resolvingIds.has(row.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
