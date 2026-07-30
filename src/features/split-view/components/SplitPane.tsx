import { Suspense } from 'react'
import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/modules/icon-map'
import { moduleRegistry } from '@/lib/modules/registry'
import { t } from '@/i18n'
import type { WorkspaceItemRow } from '@/types/database'
import { ItemPicker } from './ItemPicker'

interface SplitPaneProps {
  itemId: string | undefined
  items: WorkspaceItemRow[] | undefined
  isLoading: boolean
  onSelect: (itemId: string) => void
  onChangeItem: () => void
}

export function SplitPane({ itemId, items, isLoading, onSelect, onChangeItem }: SplitPaneProps) {
  if (!itemId) {
    return <ItemPicker items={items ?? []} onSelect={onSelect} />
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const item = items?.find((i) => i.id === itemId)

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
        <p>{t.search.noResults}</p>
        <Button variant="outline" size="sm" onClick={onChangeItem}>
          {t.splitView.pickItem}
        </Button>
      </div>
    )
  }

  const Icon = resolveIcon(item.icon, item.type)
  const moduleDef = moduleRegistry[item.type]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
        <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={onChangeItem} title={t.common.edit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {item.type === 'section' ? (
          <p className="text-sm text-muted-foreground">
            Розділи не можна відкрити в режимі порівняння. Оберіть інший елемент.
          </p>
        ) : moduleDef ? (
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <moduleDef.component item={item} />
          </Suspense>
        ) : (
          <p className="text-sm text-muted-foreground">Цей тип елемента ще не підтримує перегляд поруч.</p>
        )}
      </div>
    </div>
  )
}
