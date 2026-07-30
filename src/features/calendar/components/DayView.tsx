import { format, isSameDay, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'
import { CircleDashed, ListChecks } from 'lucide-react'

import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { PRIORITY_CLASSES } from '@/features/kanban/priority'
import type { CalendarEventRow } from '@/types/database'
import type { DeadlineItem } from '../types'

interface DayViewProps {
  referenceDate: Date
  events: CalendarEventRow[]
  deadlines: DeadlineItem[]
  onDayClick: (day: Date) => void
  onEventClick: (event: CalendarEventRow) => void
  onDeadlineClick: (deadline: DeadlineItem) => void
}

export function DayView({ referenceDate, events, deadlines, onDayClick, onEventClick, onDeadlineClick }: DayViewProps) {
  const dayEvents = events
    .filter((event) => isSameDay(parseISO(event.starts_at), referenceDate))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const dayDeadlines = deadlines.filter((deadline) => isSameDay(deadline.date, referenceDate))

  const isEmpty = dayEvents.length === 0 && dayDeadlines.length === 0

  return (
    <div
      onClick={() => onDayClick(referenceDate)}
      className="flex min-h-[24rem] flex-1 cursor-pointer flex-col gap-2 rounded-md border p-4"
    >
      {isEmpty ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t.calendar.noEvents}</p>
      ) : (
        <>
          {dayEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEventClick(event)
              }}
              className="flex items-center gap-3 rounded-md border p-2.5 text-left transition-colors hover:bg-accent/40"
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
              <span className="w-28 shrink-0 text-sm tabular-nums text-muted-foreground">
                {format(new Date(event.starts_at), 'HH:mm', { locale: uk })} –{' '}
                {format(new Date(event.ends_at), 'HH:mm', { locale: uk })}
              </span>
              <span className="truncate text-sm font-medium">{event.title}</span>
            </button>
          ))}

          {dayDeadlines.map((deadline) => {
            const Icon = deadline.kind === 'card' ? CircleDashed : ListChecks
            return (
              <button
                key={deadline.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeadlineClick(deadline)
                }}
                className={cn(
                  'flex items-center gap-3 rounded-md border border-dashed p-2.5 text-left transition-colors hover:opacity-90',
                  PRIORITY_CLASSES[deadline.priority],
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="w-28 shrink-0 text-sm">
                  {deadline.kind === 'card' ? t.calendar.deadlineFromCard : t.calendar.deadlineFromTask}
                </span>
                <span className="truncate text-sm font-medium">{deadline.title}</span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
