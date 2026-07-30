import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { t } from '@/i18n'
import { useColumns } from '@/features/kanban/hooks'
import { PRIORITY_LABELS, PRIORITY_ORDER } from '@/features/kanban/priority'
import { useCurrentWorkspace, useWorkspaceMembers } from '@/features/workspace/hooks'
import type { PriorityLevel } from '@/types/database'
import { useCard, useUpdateCard } from '../hooks'
import { AssigneesPicker } from './AssigneesPicker'
import { AttachmentsSection } from './AttachmentsSection'
import { ChecklistSection } from './ChecklistSection'
import { CommentsSection } from './CommentsSection'
import { LabelsPicker } from './LabelsPicker'

interface CardDetailDialogProps {
  cardId: string
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })
}

export function CardDetailDialog({ cardId, boardId, open, onOpenChange }: CardDetailDialogProps) {
  const { data: card, isLoading } = useCard(cardId)
  const { data: columns } = useColumns(boardId)
  const { workspace } = useCurrentWorkspace()
  const { data: members } = useWorkspaceMembers(workspace?.id)
  const updateCard = useUpdateCard(cardId, boardId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description ?? '')
    }
  }, [card])

  const debouncedSaveDescription = useDebouncedCallback((value: string) => {
    updateCard.mutate({ description: value })
  }, 600)

  function handleTitleBlur() {
    const trimmed = title.trim()
    if (trimmed && card && trimmed !== card.title) {
      updateCard.mutate({ title: trimmed })
    } else if (card) {
      setTitle(card.title)
    }
  }

  const author = members?.find((m) => m.user_id === card?.created_by)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        {isLoading || !card ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[90vh]">
            <div className="space-y-6 p-6">
              <DialogHeader>
                <DialogDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                  #{card.card_number}
                </DialogDescription>
                <DialogTitle asChild>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="h-auto border-none p-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  />
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t.card.column}</Label>
                  <Select
                    value={card.column_id}
                    onValueChange={(value) => updateCard.mutate({ column_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns?.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{t.card.priority}</Label>
                  <Select
                    value={card.priority}
                    onValueChange={(value) => updateCard.mutate({ priority: value as PriorityLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_ORDER.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{t.card.startDate}</Label>
                  <Input
                    type="date"
                    value={toDateInputValue(card.start_date)}
                    onChange={(e) =>
                      updateCard.mutate({ start_date: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t.card.dueDate}</Label>
                  <Input
                    type="date"
                    value={toDateInputValue(card.due_date)}
                    onChange={(e) =>
                      updateCard.mutate({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t.card.assignees}</Label>
                <AssigneesPicker cardId={cardId} boardId={boardId} />
              </div>

              <div className="space-y-1.5">
                <Label>{t.card.labels}</Label>
                <LabelsPicker cardId={cardId} boardId={boardId} />
              </div>

              <div className="space-y-1.5">
                <Label>{t.card.description}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    debouncedSaveDescription(e.target.value)
                  }}
                  className="min-h-24"
                />
              </div>

              <Separator />

              <ChecklistSection cardId={cardId} boardId={boardId} />

              <Separator />

              <CommentsSection cardId={cardId} boardId={boardId} />

              <Separator />

              <AttachmentsSection cardId={cardId} boardId={boardId} />

              <Separator />

              <div className="space-y-1 text-xs text-muted-foreground">
                <h3 className="text-sm font-semibold text-foreground">{t.card.history}</h3>
                <p>
                  {t.card.author}: {author?.profile?.full_name ?? '—'}
                </p>
                <p>
                  {t.card.createdAt}: {formatDateTime(card.created_at)}
                </p>
                <p>
                  {t.card.updatedAt}: {formatDateTime(card.updated_at)}
                </p>
                {updateCard.isPending && (
                  <p className="flex items-center gap-1 text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t.common.saving}
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
