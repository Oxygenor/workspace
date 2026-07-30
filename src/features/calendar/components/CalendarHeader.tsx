import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import type { CalendarViewMode } from '../types'

interface CalendarHeaderProps {
  viewMode: CalendarViewMode
  onViewModeChange: (mode: CalendarViewMode) => void
  referenceDate: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onAddEvent: () => void
}

const VIEW_MODES: { value: CalendarViewMode; label: string }[] = [
  { value: 'month', label: t.calendar.month },
  { value: 'week', label: t.calendar.week },
  { value: 'day', label: t.calendar.day },
]

function formatPeriodLabel(referenceDate: Date, viewMode: CalendarViewMode): string {
  if (viewMode === 'day') return format(referenceDate, 'd MMMM yyyy', { locale: uk })
  return format(referenceDate, 'LLLL yyyy', { locale: uk })
}

export function CalendarHeader({
  viewMode,
  onViewModeChange,
  referenceDate,
  onPrev,
  onNext,
  onToday,
  onAddEvent,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          {t.calendar.today}
        </Button>
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label={t.calendar.previousPeriod}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label={t.calendar.nextPeriod}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="ml-1 text-lg font-semibold capitalize">{formatPeriodLabel(referenceDate, viewMode)}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border p-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onViewModeChange(mode.value)}
              className={cn(
                'rounded px-3 py-1 text-sm font-medium transition-colors',
                viewMode === mode.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onAddEvent}>
          <Plus className="h-4 w-4" />
          {t.calendar.addEvent}
        </Button>
      </div>
    </div>
  )
}
