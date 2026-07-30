import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, MessageSquare, Paperclip } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCurrentWorkspace, useWorkspaceMembers } from '@/features/workspace/hooks'
import { PRIORITY_CLASSES, PRIORITY_LABELS } from '../priority'
import type { KanbanCardSummary } from '../types'
import { useBoardLabels } from '../hooks'

interface KanbanCardPreviewProps {
  card: KanbanCardSummary
  boardId: string
  onOpen: () => void
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < Date.now()
}

export function KanbanCardPreview({ card, boardId, onOpen }: KanbanCardPreviewProps) {
  const { workspace } = useCurrentWorkspace()
  const { data: members } = useWorkspaceMembers(workspace?.id)
  const { data: labels } = useBoardLabels(boardId)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card:${card.id}`,
    data: { kind: 'card' as const, card },
  })

  const assignedMembers = (members ?? []).filter((m) => card.assigneeIds.includes(m.user_id))
  const cardLabels = (labels ?? []).filter((l) => card.labelIds.includes(l.id))
  const overdue = isOverdue(card.due_date)

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'cursor-pointer space-y-2 p-3 text-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-40',
      )}
    >
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
        <Badge variant="secondary" className={cn('px-1.5 py-0 text-[10px]', PRIORITY_CLASSES[card.priority])}>
          {PRIORITY_LABELS[card.priority]}
        </Badge>
        {card.due_date && (
          <span className={overdue ? 'font-medium text-destructive' : ''}>
            {new Date(card.due_date).toLocaleDateString('uk-UA')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
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

        {assignedMembers.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignedMembers.slice(0, 3).map((member) => (
              <Avatar key={member.user_id} className="h-5 w-5 border border-card">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {(member.profile?.full_name ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
