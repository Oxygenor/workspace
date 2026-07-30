import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, parseISO, startOfWeek } from 'date-fns'
import { uk } from 'date-fns/locale'

import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import type { CalendarEventRow } from '@/types/database'
import type { DeadlineItem } from '../types'
import { DeadlineChip } from './DeadlineChip'
import { EventChip } from './EventChip'

interface WeekViewProps {
  referenceDate: Date
  events: CalendarEventRow[]
  deadlines: DeadlineItem[]
  onDayClick: (day: Date) => void
  onEventClick: (event: CalendarEventRow) => void
  onDeadlineClick: (deadline: DeadlineItem) => void
}

export function WeekView({ referenceDate, events, deadlines, onDayClick, onEventClick, onDeadlineClick }: WeekViewProps) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  return (
    <div className="grid flex-1 grid-cols-7 gap-2 overflow-y-auto">
      {days.map((day) => {
        const dayEvents = events
          .filter((event) => isSameDay(parseISO(event.starts_at), day))
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        const dayDeadlines = deadlines.filter((deadline) => isSameDay(deadline.date, day))

        return (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={cn(
              'flex min-h-[16rem] cursor-pointer flex-col gap-1.5 rounded-md border p-2 transition-colors hover:bg-accent/30',
              isToday(day) && 'border-primary bg-primary/5',
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {format(day, 'EEEEEE', { locale: uk })}
              </span>
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday(day) && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-1">
              {dayEvents.map((event) => (
                <EventChip key={event.id} event={event} onClick={onEventClick} />
              ))}
              {dayDeadlines.map((deadline) => (
                <DeadlineChip key={deadline.id} deadline={deadline} onClick={onDeadlineClick} />
              ))}
              {dayEvents.length === 0 && dayDeadlines.length === 0 && (
                <span className="mt-2 text-center text-[11px] text-muted-foreground">{t.calendar.noEvents}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
