import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Clock, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { t } from '@/i18n'
import { usePomodoroStore } from '@/stores/pomodoro-store'
import { useRunningTimer, useStopTimer } from '../hooks'
import { LiveElapsed } from './LiveElapsed'

interface WidgetTarget {
  title: string
  navigateId: string
}

async function fetchWidgetTarget(cardId: string | null, taskId: string | null): Promise<WidgetTarget | null> {
  if (cardId) {
    const { data, error } = await supabase.from('kanban_cards').select('title, board_id').eq('id', cardId).maybeSingle()
    if (error) throw error
    return data ? { title: data.title, navigateId: data.board_id } : null
  }
  if (taskId) {
    const { data, error } = await supabase.from('tasks').select('title, task_list_id').eq('id', taskId).maybeSingle()
    if (error) throw error
    return data ? { title: data.title, navigateId: data.task_list_id } : null
  }
  return null
}

/** Persistent topbar pill shown only while a timer is running; renders nothing otherwise. */
export function GlobalTimerWidget() {
  const { data: runningEntry } = useRunningTimer()
  const stopTimer = useStopTimer()
  const navigate = useNavigate()
  const pomodoroTimeEntryId = usePomodoroStore((s) => s.timeEntryId)

  const cardId = runningEntry?.card_id ?? null
  const taskId = runningEntry?.task_id ?? null

  const { data: target } = useQuery({
    queryKey: ['time-widget-target', cardId, taskId],
    queryFn: () => fetchWidgetTarget(cardId, taskId),
    enabled: Boolean(cardId || taskId),
  })

  // A Pomodoro-driven entry gets its own richer widget (PomodoroWidget) —
  // avoid showing two overlapping "you're tracking X" indicators at once.
  if (!runningEntry || runningEntry.id === pomodoroTimeEntryId) return null

  return (
    <button
      type="button"
      onClick={() => target && navigate(`/app/item/${target.navigateId}`)}
      className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm text-foreground transition-colors hover:bg-accent"
      title={t.time.currentlyTracking}
    >
      <Clock className="h-4 w-4 shrink-0 text-primary" />
      {target && <span className="hidden max-w-[10rem] truncate sm:inline">{target.title}</span>}
      <LiveElapsed startedAt={runningEntry.started_at} />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        aria-label={t.time.stop}
        onClick={(e) => {
          e.stopPropagation()
          stopTimer.mutate(runningEntry.id)
        }}
      >
        <Square className="h-3.5 w-3.5" />
      </Button>
    </button>
  )
}
