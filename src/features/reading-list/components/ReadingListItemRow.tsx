import { useState } from 'react'
import { Link2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { ReadingListItemRow as ReadingListItemRowType } from '@/types/database'
import { useDeleteReadingListItem, useUpdateReadingListItem } from '../hooks'

interface ReadingListItemRowProps {
  listId: string
  item: ReadingListItemRowType
  isResolving: boolean
}

export function ReadingListItemRow({ listId, item, isResolving }: ReadingListItemRowProps) {
  const updateItem = useUpdateReadingListItem(listId)
  const deleteItem = useDeleteReadingListItem(listId)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50',
        item.is_read && 'opacity-50',
      )}
    >
      <Checkbox
        checked={item.is_read}
        onCheckedChange={(checked) => updateItem.mutate({ itemId: item.id, input: { is_read: checked === true } })}
        title={item.is_read ? t.readingList.markUnread : t.readingList.markRead}
        aria-label={item.is_read ? t.readingList.markUnread : t.readingList.markRead}
      />

      {item.favicon_url ? (
        <img src={item.favicon_url} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
      ) : (
        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}

      <a
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        title={t.readingList.openLink}
        aria-label={t.readingList.openLink}
        className={cn('min-w-0 flex-1 truncate text-sm', item.is_read && 'line-through')}
      >
        {item.title ?? item.url}
      </a>

      {isResolving && <span className="shrink-0 text-xs text-muted-foreground">{t.readingList.fetchingTitle}</span>}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={() => setDeleteConfirmOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.tree.confirmDeleteTitle}
        description={t.tree.confirmDeleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteItem.mutate(item.id)}
      />
    </div>
  )
}
