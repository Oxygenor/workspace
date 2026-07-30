import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'
import { Play, Square, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { t } from '@/i18n'
import { usePomodoroStore } from '@/stores/pomodoro-store'
import { formatDuration } from '../format'
import { useDeleteTimeEntry, useEntriesForTarget, useRunningTimer, useStartTimer, useStopTimer, useTotalSecondsForTarget } from '../hooks'
import { LiveElapsed } from './LiveElapsed'
import { PomodoroControls } from './PomodoroControls'

interface TimeTrackingSectionProps {
  cardId?: string
  taskId?: string
  title: string
}

export function TimeTrackingSection({ cardId, taskId, title }: TimeTrackingSectionProps) {
  const { data: runningEntry, isLoading: runningLoading } = useRunningTimer()
  const { data: entries, isLoading: entriesLoading } = useEntriesForTarget({ cardId, taskId })
  const { data: totalSeconds, isLoading: totalLoading } = useTotalSecondsForTarget({ cardId, taskId })
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const deleteEntry = useDeleteTimeEntry({ cardId, taskId })
  const pomodoroStatus = usePomodoroStore((s) => s.status)
  const [mode, setMode] = useState<'free' | 'pomodoro'>('free')

  const isRunningForThis = Boolean(
    runningEntry && (cardId ? runningEntry.card_id === cardId : runningEntry.task_id === taskId),
  )
  const pomodoroActive = pomodoroStatus !== 'idle'

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isRunningForThis) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isRunningForThis])

  const liveSeconds =
    isRunningForThis && runningEntry ? Math.max(0, (now - new Date(runningEntry.started_at).getTime()) / 1000) : 0
  const displayedTotal = (totalSeconds ?? 0) + liveSeconds

  function handleToggle() {
    if (isRunningForThis && runningEntry) {
      stopTimer.mutate(runningEntry.id)
    } else {
      startTimer.mutate({ cardId, taskId })
    }
  }

  const recentEntries = entries?.slice(0, 5) ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t.time.sectionTitle}</h3>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'free' | 'pomodoro')}>
          <TabsList className="h-7">
            <TabsTrigger value="free" className="h-6 px-2 text-xs">
              {t.time.freeMode}
            </TabsTrigger>
            <TabsTrigger value="pomodoro" className="h-6 px-2 text-xs">
              {t.time.pomodoroMode}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === 'free' ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {pomodoroActive && !isRunningForThis ? t.time.blockedByPomodoro : ''}
          </span>
          <Button
            variant={isRunningForThis ? 'destructive' : 'outline'}
            size="sm"
            disabled={runningLoading || startTimer.isPending || stopTimer.isPending || (pomodoroActive && !isRunningForThis)}
            onClick={handleToggle}
          >
            {isRunningForThis ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isRunningForThis ? t.time.stop : t.time.start}
          </Button>
        </div>
      ) : (
        <PomodoroControls cardId={cardId} taskId={taskId} title={title} />
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t.time.totalTracked}</span>
        {totalLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="font-medium tabular-nums text-foreground">{formatDuration(displayedTotal)}</span>
        )}
      </div>

      {isRunningForThis && runningEntry && (
        <div className="flex items-center justify-between rounded-md bg-accent px-2.5 py-1.5 text-sm">
          <span className="text-muted-foreground">{t.time.currentlyTracking}</span>
          <LiveElapsed startedAt={runningEntry.started_at} />
        </div>
      )}

      <Separator />

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t.time.recentEntries}</p>

        {entriesLoading && <Skeleton className="h-16 w-full" />}

        {!entriesLoading && recentEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.time.noEntries}</p>
        )}

        <div className="space-y-1">
          {recentEntries.map((entry) => (
            <div key={entry.id} className="group flex items-center gap-2 text-sm">
              <span className="flex-1 truncate text-muted-foreground">
                {format(new Date(entry.started_at), 'd MMM, HH:mm', { locale: ukLocale })}
              </span>
              <span className="tabular-nums text-foreground">
                {entry.ended_at ? (
                  formatDuration((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000)
                ) : (
                  <LiveElapsed startedAt={entry.started_at} />
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                aria-label={t.time.deleteEntry}
                onClick={() => deleteEntry.mutate(entry.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
