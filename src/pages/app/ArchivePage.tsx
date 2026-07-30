import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import { useArchivedItems, useDeleteItem, useRestoreItem } from '@/features/workspace-tree/hooks'

export default function ArchivePage() {
  const { data: items, isLoading } = useArchivedItems()
  const restoreItem = useRestoreItem()
  const deleteItem = useDeleteItem()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-foreground">{t.archive.title}</h1>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && (items?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Archive className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">{t.archive.empty}</p>
        </div>
      )}

      <div className="space-y-2">
        {items?.map((item) => {
          const Icon = resolveIcon(item.icon, item.type)
          return (
            <Card key={item.id} className="flex flex-row items-center gap-3 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.archive.archivedAt}: {item.archived_at ? new Date(item.archived_at).toLocaleString('uk-UA') : '—'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => restoreItem.mutate(item.id)}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t.common.restore}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTargetId(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          )
        })}
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title={t.tree.confirmDeleteTitle}
        description={t.tree.confirmDeleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (deleteTargetId) deleteItem.mutate(deleteTargetId)
          setDeleteTargetId(null)
        }}
      />
    </div>
  )
}
