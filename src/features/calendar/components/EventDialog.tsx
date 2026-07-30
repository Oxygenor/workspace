import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'
import { COLUMN_COLORS } from '@/lib/validations/kanban'
import { cn } from '@/lib/utils'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import type { CalendarEventRow } from '@/types/database'
import type { CalendarEventInput } from '../api'
import { useCreateEvent, useDeadlineCards, useDeleteEvent, useUpdateEvent } from '../hooks'
import {
  fromDateTimeLocalValue,
  getReminderOptions,
  reminderMinutesToValue,
  reminderValueToMinutes,
  toDateTimeLocalValue,
} from '../utils'

interface EventDialogProps {
  calendarId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEventRow | null
  defaultStart?: Date
}

const NONE = 'none'

function roundToNextHour(date: Date): Date {
  const rounded = new Date(date)
  rounded.setMinutes(0, 0, 0)
  rounded.setHours(rounded.getHours() + 1)
  return rounded
}

export function EventDialog({ calendarId, open, onOpenChange, event, defaultStart }: EventDialogProps) {
  const isEditing = Boolean(event)
  const { data: workspaceItems } = useWorkspaceItems()
  const { data: deadlineCards } = useDeadlineCards()
  const createEvent = useCreateEvent(calendarId)
  const updateEvent = useUpdateEvent(calendarId)
  const deleteEvent = useDeleteEvent(calendarId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [color, setColor] = useState<string>(COLUMN_COLORS[0])
  const [relatedCardId, setRelatedCardId] = useState(NONE)
  const [relatedItemId, setRelatedItemId] = useState(NONE)
  const [reminderValue, setReminderValue] = useState('none')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    if (event) {
      setTitle(event.title)
      setDescription(event.description ?? '')
      setStartsAt(toDateTimeLocalValue(event.starts_at))
      setEndsAt(toDateTimeLocalValue(event.ends_at))
      setColor(event.color)
      setRelatedCardId(event.related_card_id ?? NONE)
      setRelatedItemId(event.related_item_id ?? NONE)
      setReminderValue(reminderMinutesToValue(event.reminder_minutes_before))
    } else {
      const start = roundToNextHour(defaultStart ?? new Date())
      const end = new Date(start.getTime() + 60 * 60 * 1000)
      setTitle('')
      setDescription('')
      setStartsAt(toDateTimeLocalValue(start.toISOString()))
      setEndsAt(toDateTimeLocalValue(end.toISOString()))
      setColor(COLUMN_COLORS[0])
      setRelatedCardId(NONE)
      setRelatedItemId(NONE)
      setReminderValue('none')
    }
  }, [open, event, defaultStart])

  const sections = (workspaceItems ?? []).filter((item) => item.type === 'section' && !item.archived_at)

  const isValid = title.trim().length > 0 && Boolean(startsAt) && Boolean(endsAt)

  function buildInput(): CalendarEventInput {
    return {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      starts_at: fromDateTimeLocalValue(startsAt),
      ends_at: fromDateTimeLocalValue(endsAt),
      color,
      related_card_id: relatedCardId === NONE ? null : relatedCardId,
      related_item_id: relatedItemId === NONE ? null : relatedItemId,
      reminder_minutes_before: reminderValueToMinutes(reminderValue),
    }
  }

  function handleSave() {
    if (!isValid) return
    const input = buildInput()
    if (isEditing && event) {
      updateEvent.mutate({ eventId: event.id, input }, { onSuccess: () => onOpenChange(false) })
    } else {
      createEvent.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  function handleDelete() {
    if (!event) return
    deleteEvent.mutate(event.id, { onSuccess: () => setConfirmDeleteOpen(false) })
    onOpenChange(false)
  }

  const isSaving = createEvent.isPending || updateEvent.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? t.calendar.editEventTitle : t.calendar.newEventTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.calendar.eventTitle}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.calendar.eventTitle} autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label>{t.common.description}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.calendar.start}</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.calendar.end}</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.calendar.color}</Label>
              <div className="flex flex-wrap gap-2">
                {COLUMN_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-transform',
                      color === swatch ? 'scale-110 border-foreground' : 'border-transparent',
                    )}
                    style={{ backgroundColor: swatch }}
                    aria-label={swatch}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.calendar.relatedCard}</Label>
                <Select value={relatedCardId} onValueChange={setRelatedCardId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t.calendar.none}</SelectItem>
                    {(deadlineCards ?? []).map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t.calendar.relatedSection}</Label>
                <Select value={relatedItemId} onValueChange={setRelatedItemId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t.calendar.none}</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.calendar.reminder}</Label>
              <Select value={reminderValue} onValueChange={setReminderValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getReminderOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="items-center sm:justify-between">
            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {t.common.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </Button>
              <Button type="button" onClick={handleSave} disabled={!isValid || isSaving}>
                {t.common.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t.calendar.confirmDeleteTitle}
        description={t.calendar.confirmDeleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
      />
    </>
  )
}
