import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, Clock, MessageSquare, Paperclip, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import { PRIORITY_CLASSES, PRIORITY_LABELS } from '../priority'
import type { KanbanCardSummary } from '../types'
import { useBoardLabels, useDeleteCard } from '../hooks'

const STALE_DAYS = 7

interface KanbanCardPreviewProps {
  card: KanbanCardSummary
  boardId: string
  onOpen: () => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (cardId: string) => void
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < Date.now()
}

export function KanbanCardPreview({
  card,
  boardId,
  onOpen,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: KanbanCardPreviewProps) {
  const { data: labels } = useBoardLabels(boardId)
  const deleteCard = useDeleteCard(boardId)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card:${card.id}`,
    data: { kind: 'card' as const, card },
  })

  const cardLabels = (labels ?? []).filter((l) => card.labelIds.includes(l.id))
  const overdue = isOverdue(card.due_date)
  const isStale = Date.now() - new Date(card.updated_at).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      style={{
        transform: CSS.Translate.toString(transform),
        borderLeftColor: card.color ?? undefined,
      }}
      title={isStale ? t.staleCard.label : undefined}
      className={cn(
        'group relative cursor-pointer space-y-2 p-3 text-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-40',
        card.color ? 'border-l-[3px]' : isStale && 'border-l-2 border-l-amber-500',
      )}
    >
      {selectMode ? (
        <div
          className="absolute right-2 top-2 z-10 rounded bg-background/80 p-0.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox checked={selected} onCheckedChange={() => onToggleSelect?.(card.id)} />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 z-10 h-6 w-6 shrink-0 bg-background/80 opacity-0 group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            setDeleteConfirmOpen(true)
          }}
          title={t.common.delete}
          aria-label={t.common.delete}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}

      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((label) => (
            <span key={label.id} className="h-1.5 w-6 rounded-full" style={{ backgroundColor: label.color }} />
          ))}
        </div>
      )}

      <p className="font-medium text-foreground">{card.title}</p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>#{card.card_number}</span>
        {isStale && card.color && <Clock className="h-3 w-3 text-amber-500" />}
        <Badge variant="secondary" className={cn('px-1.5 py-0 text-[10px]', PRIORITY_CLASSES[card.priority])}>
          {PRIORITY_LABELS[card.priority]}
        </Badge>
        {card.due_date && (
          <span className={overdue ? 'font-medium text-destructive' : ''}>
            {new Date(card.due_date).toLocaleDateString('uk-UA')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {card.checklistTotal > 0 && (
          <span className="flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            {card.checklistCompleted}/{card.checklistTotal}
          </span>
        )}
        {card.commentsCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {card.commentsCount}
          </span>
        )}
        {card.attachmentsCount > 0 && (
          <span className="flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            {card.attachmentsCount}
          </span>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={t.tree.confirmDeleteTitle}
          description={t.tree.confirmDeleteDescription}
          confirmLabel={t.common.delete}
          onConfirm={() => deleteCard.mutate(card.id)}
        />
      </div>
    </Card>
  )
}
