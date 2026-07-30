import { format } from 'date-fns'
import { uk } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import type { CalendarEventRow } from '@/types/database'

interface EventChipProps {
  event: CalendarEventRow
  onClick: (event: CalendarEventRow) => void
  className?: string
}

export function EventChip({ event, onClick, className }: EventChipProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(event)
      }}
      className={cn(
        'flex w-full items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-left text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90',
        className,
      )}
      style={{ backgroundColor: event.color }}
      title={event.title}
    >
      <span className="shrink-0 tabular-nums opacity-90">{format(new Date(event.starts_at), 'HH:mm', { locale: uk })}</span>
      <span className="truncate">{event.title}</span>
    </button>
  )
}
