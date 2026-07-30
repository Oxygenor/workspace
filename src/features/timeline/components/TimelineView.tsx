import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfWeek,
  format,
  isSameDay,
  max,
  min,
  startOfDay,
} from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { PRIORITY_LABELS } from '@/features/kanban/priority'
import { t } from '@/i18n'
import type { PriorityLevel } from '@/types/database'
import type { TimelineEntry } from '../api'

interface TimelineViewProps {
  entries: TimelineEntry[]
}

// Solid backgrounds (rather than the pastel `PRIORITY_CLASSES` used for
// badges elsewhere) read better as a filled Gantt bar with a light label on top.
const PRIORITY_BAR_CLASSES: Record<PriorityLevel, string> = {
  low: 'bg-slate-400 dark:bg-slate-500',
  medium: 'bg-blue-500 dark:bg-blue-500',
  high: 'bg-amber-500 dark:bg-amber-500',
  critical: 'bg-red-500 dark:bg-red-500',
}

const DAY_WIDTH_PX = 40
const PADDING_DAYS = 2
const DAY_LEVEL_THRESHOLD = 45
const LABEL_COLUMN_PX = 200
const ROW_HEIGHT_PX = 36

export function TimelineView({ entries }: TimelineViewProps) {
  const navigate = useNavigate()

  const range = useMemo(() => {
    if (entries.length === 0) return null
    const earliestStart = min(entries.map((entry) => entry.start))
    const latestEnd = max(entries.map((entry) => entry.end))
    const start = startOfDay(addDays(earliestStart, -PADDING_DAYS))
    const end = startOfDay(addDays(latestEnd, PADDING_DAYS))
    const totalDays = differenceInCalendarDays(end, start) + 1
    return { start, end, totalDays }
  }, [entries])

  if (!range || entries.length === 0) return null

  const { start: rangeStart, totalDays } = range
  const chartWidth = totalDays * DAY_WIDTH_PX
  const today = startOfDay(new Date())
  const showTodayLine = today >= rangeStart && today <= range.end
  const todayLeftPercent = (differenceInCalendarDays(today, rangeStart) / totalDays) * 100

  function leftPercentOf(date: Date) {
    return (differenceInCalendarDays(startOfDay(date), rangeStart) / totalDays) * 100
  }

  function widthPercentOf(start: Date, end: Date) {
    const span = differenceInCalendarDays(startOfDay(end), startOfDay(start)) + 1
    return (span / totalDays) * 100
  }

  const useDayTicks = totalDays <= DAY_LEVEL_THRESHOLD
  const dayTicks = useDayTicks ? eachDayOfInterval({ start: rangeStart, end: range.end }) : []
  const weekTicks = useDayTicks
    ? []
    : eachWeekOfInterval({ start: rangeStart, end: range.end }, { weekStartsOn: 1 }).map((weekStart) => {
        const clippedStart = weekStart < rangeStart ? rangeStart : weekStart
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const clippedEnd = weekEnd > range.end ? range.end : weekEnd
        return { weekStart, clippedStart, clippedEnd }
      })

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div style={{ width: LABEL_COLUMN_PX + chartWidth }}>
        {/* Header: day/week ticks */}
        <div className="flex border-b border-border bg-muted/40">
          <div className="shrink-0 border-r border-border" style={{ width: LABEL_COLUMN_PX }} />
          <div className="relative flex" style={{ width: chartWidth }}>
            {useDayTicks
              ? dayTicks.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'flex shrink-0 flex-col items-center justify-center border-r border-border/60 py-1.5 text-[11px] text-muted-foreground',
                      isSameDay(day, today) && 'bg-primary/10 font-medium text-foreground',
                    )}
                    style={{ width: DAY_WIDTH_PX }}
                  >
                    <span className="capitalize">{format(day, day.getDate() === 1 ? 'd MMM' : 'd', { locale: ukLocale })}</span>
                  </div>
                ))
              : weekTicks.map(({ weekStart, clippedStart, clippedEnd }) => {
                  const widthDays = differenceInCalendarDays(clippedEnd, clippedStart) + 1
                  return (
                    <div
                      key={weekStart.toISOString()}
                      className="flex shrink-0 flex-col items-center justify-center border-r border-border/60 py-1.5 text-[11px] text-muted-foreground"
                      style={{ width: widthDays * DAY_WIDTH_PX }}
                    >
                      <span className="capitalize">{format(clippedStart, 'd MMM', { locale: ukLocale })}</span>
                    </div>
                  )
                })}
          </div>
        </div>

        {/* Rows */}
        <div className="relative">
          {showTodayLine && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary/70"
              style={{ left: LABEL_COLUMN_PX + (todayLeftPercent / 100) * chartWidth }}
              title={t.timeline.today}
            />
          )}

          {entries.map((entry) => {
            const isSingleDay = isSameDay(entry.start, entry.end)
            const leftPercent = leftPercentOf(entry.start)
            const widthPercent = widthPercentOf(entry.start, entry.end)
            const priorityLabel = PRIORITY_LABELS[entry.priority]
            const tooltip = `${entry.title} — ${priorityLabel} (${format(entry.start, 'd MMM', { locale: ukLocale })}${
              isSingleDay ? '' : ` – ${format(entry.end, 'd MMM', { locale: ukLocale })}`
            })`

            return (
              <div key={entry.id} className="flex border-b border-border/60 last:border-b-0" style={{ height: ROW_HEIGHT_PX }}>
                <div
                  className="flex shrink-0 items-center truncate border-r border-border px-2 text-xs font-medium text-foreground"
                  style={{ width: LABEL_COLUMN_PX }}
                  title={entry.title}
                >
                  <span className="truncate">{entry.title}</span>
                </div>
                <div className="relative shrink-0" style={{ width: chartWidth }}>
                  {isSingleDay ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/app/item/${entry.targetItemId}`)}
                      title={tooltip}
                      className={cn(
                        'absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 cursor-pointer border border-black/10 shadow-sm transition-transform hover:scale-125',
                        PRIORITY_BAR_CLASSES[entry.priority],
                      )}
                      style={{ left: `calc(${leftPercent}% - 6px)` }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/app/item/${entry.targetItemId}`)}
                      title={tooltip}
                      className={cn(
                        'absolute top-1/2 flex h-5 -translate-y-1/2 cursor-pointer items-center overflow-hidden rounded px-1.5 text-left text-[11px] font-medium text-white shadow-sm transition-opacity hover:opacity-90',
                        PRIORITY_BAR_CLASSES[entry.priority],
                      )}
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    >
                      <span className="truncate">{entry.title}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
