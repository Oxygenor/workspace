import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { uk } from 'date-fns/locale'

import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import type { CalendarEventRow } from '@/types/database'
import type { DeadlineItem } from '../types'
import { DeadlineChip } from './DeadlineChip'
import { EventChip } from './EventChip'

interface MonthViewProps {
  referenceDate: Date
  events: CalendarEventRow[]
  deadlines: DeadlineItem[]
  onDayClick: (day: Date) => void
  onEventClick: (event: CalendarEventRow) => void
  onDeadlineClick: (deadline: DeadlineItem) => void
}

const MAX_VISIBLE = 3

export function MonthView({ referenceDate, events, deadlines, onDayClick, onEventClick, onDeadlineClick }: MonthViewProps) {
  const monthStart = startOfMonth(referenceDate)
  const monthEnd = endOfMonth(referenceDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdayLabels = days.slice(0, 7).map((day) => format(day, 'EEEEEE', { locale: uk }))

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-md border">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {weekdayLabels.map((label, i) => (
          <div key={i} className="p-2 text-center text-xs font-medium capitalize text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-[minmax(6rem,1fr)] grid-cols-7 overflow-y-auto">
        {days.map((day) => {
          const dayEvents = events
            .filter((event) => isSameDay(parseISO(event.starts_at), day))
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
          const dayDeadlines = deadlines.filter((deadline) => isSameDay(deadline.date, day))
          const totalCount = dayEvents.length + dayDeadlines.length
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE)
          const remainingSlots = Math.max(0, MAX_VISIBLE - visibleEvents.length)
          const visibleDeadlines = dayDeadlines.slice(0, remainingSlots)
          const hiddenCount = totalCount - visibleEvents.length - visibleDeadlines.length

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'flex min-h-[100px] cursor-pointer flex-col gap-1 border-b border-r p-1.5 transition-colors hover:bg-accent/40',
                !isSameMonth(day, referenceDate) && 'bg-muted/20 text-muted-foreground',
                isToday(day) && 'bg-primary/5',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday(day) && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>

              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {visibleEvents.map((event) => (
                  <EventChip key={event.id} event={event} onClick={onEventClick} />
                ))}
                {visibleDeadlines.map((deadline) => (
                  <DeadlineChip key={deadline.id} deadline={deadline} onClick={onDeadlineClick} />
                ))}
                {hiddenCount > 0 && (
                  <span className="px-1.5 text-[11px] text-muted-foreground">
                    +{hiddenCount} {t.calendar.more}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
