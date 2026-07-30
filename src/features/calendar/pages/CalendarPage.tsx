import { useMemo, useState } from 'react'
import { addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from 'date-fns'
import { useNavigate } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import type { ModuleComponentProps } from '@/lib/modules/registry'
import type { CalendarEventRow } from '@/types/database'
import { CalendarHeader } from '../components/CalendarHeader'
import { DayView } from '../components/DayView'
import { EventDialog } from '../components/EventDialog'
import { MonthView } from '../components/MonthView'
import { WeekView } from '../components/WeekView'
import { useCalendarEvents, useDeadlineCards, useDeadlineTasks } from '../hooks'
import type { CalendarViewMode, DeadlineItem } from '../types'
import { buildDeadlineItems } from '../utils'

type DialogState = { open: boolean; event: CalendarEventRow | null; defaultStart?: Date }

export function CalendarPage({ item }: ModuleComponentProps) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  const [dialogState, setDialogState] = useState<DialogState>({ open: false, event: null })

  const { data: events, isLoading: eventsLoading } = useCalendarEvents(item.id)
  const { data: deadlineCards, isLoading: cardsLoading } = useDeadlineCards()
  const { data: deadlineTasks, isLoading: tasksLoading } = useDeadlineTasks()

  const deadlines = useMemo(() => buildDeadlineItems(deadlineCards, deadlineTasks), [deadlineCards, deadlineTasks])
  const isLoading = eventsLoading || cardsLoading || tasksLoading

  function goToPrev() {
    setReferenceDate((current) => {
      if (viewMode === 'month') return subMonths(current, 1)
      if (viewMode === 'week') return subWeeks(current, 1)
      return subDays(current, 1)
    })
  }

  function goToNext() {
    setReferenceDate((current) => {
      if (viewMode === 'month') return addMonths(current, 1)
      if (viewMode === 'week') return addWeeks(current, 1)
      return addDays(current, 1)
    })
  }

  function goToToday() {
    setReferenceDate(new Date())
  }

  function openCreateDialog(day: Date) {
    setDialogState({ open: true, event: null, defaultStart: day })
  }

  function openEditDialog(event: CalendarEventRow) {
    setDialogState({ open: true, event })
  }

  function handleDeadlineClick(deadline: DeadlineItem) {
    navigate(`/app/item/${deadline.targetItemId}`)
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4">
      <CalendarHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        referenceDate={referenceDate}
        onPrev={goToPrev}
        onNext={goToNext}
        onToday={goToToday}
        onAddEvent={() => openCreateDialog(referenceDate)}
      />

      {isLoading ? (
        <div className="grid flex-1 grid-cols-7 gap-2">
          {Array.from({ length: 21 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          {viewMode === 'month' && (
            <MonthView
              referenceDate={referenceDate}
              events={events ?? []}
              deadlines={deadlines}
              onDayClick={openCreateDialog}
              onEventClick={openEditDialog}
              onDeadlineClick={handleDeadlineClick}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              referenceDate={referenceDate}
              events={events ?? []}
              deadlines={deadlines}
              onDayClick={openCreateDialog}
              onEventClick={openEditDialog}
              onDeadlineClick={handleDeadlineClick}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              referenceDate={referenceDate}
              events={events ?? []}
              deadlines={deadlines}
              onDayClick={openCreateDialog}
              onEventClick={openEditDialog}
              onDeadlineClick={handleDeadlineClick}
            />
          )}
        </>
      )}

      <EventDialog
        calendarId={item.id}
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((current) => ({ ...current, open }))}
        event={dialogState.event}
        defaultStart={dialogState.defaultStart}
      />
    </div>
  )
}
