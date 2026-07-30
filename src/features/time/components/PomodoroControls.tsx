import { Pause, Play, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import { usePomodoroStore } from '@/stores/pomodoro-store'
import { formatDuration } from '../format'

interface PomodoroControlsProps {
  cardId?: string
  taskId?: string
  title: string
}

const PHASE_LABELS = {
  work: t.pomodoro.work,
  'short-break': t.pomodoro.shortBreak,
  'long-break': t.pomodoro.longBreak,
} as const

export function PomodoroControls({ cardId, taskId, title }: PomodoroControlsProps) {
  const status = usePomodoroStore((s) => s.status)
  const phase = usePomodoroStore((s) => s.phase)
  const secondsRemaining = usePomodoroStore((s) => s.secondsRemaining)
  const target = usePomodoroStore((s) => s.target)
  const completedWorkSessions = usePomodoroStore((s) => s.completedWorkSessions)
  const sessionsUntilLongBreak = usePomodoroStore((s) => s.sessionsUntilLongBreak)
  const startWork = usePomodoroStore((s) => s.startWork)
  const pause = usePomodoroStore((s) => s.pause)
  const resume = usePomodoroStore((s) => s.resume)
  const stop = usePomodoroStore((s) => s.stop)

  const isForThis = Boolean(target && (cardId ? target.cardId === cardId : target.taskId === taskId))
  const isActiveElsewhere = status !== 'idle' && !isForThis

  if (isActiveElsewhere && target) {
    return (
      <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
        {t.pomodoro.activeForOther.replace('{title}', target.title)}
      </p>
    )
  }

  if (!isForThis || status === 'idle') {
    return (
      <Button variant="outline" size="sm" onClick={() => startWork({ cardId, taskId, title })}>
        <Play className="h-3.5 w-3.5" />
        {t.pomodoro.start}
      </Button>
    )
  }

  const dots = Array.from({ length: sessionsUntilLongBreak }, (_, i) => i < completedWorkSessions % sessionsUntilLongBreak)

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            phase === 'work' ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {PHASE_LABELS[phase]}
        </span>
        <div className="flex gap-1">
          {dots.map((filled, i) => (
            <span key={i} className={cn('h-1.5 w-1.5 rounded-full', filled ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>
      </div>

      <p className="text-center text-3xl font-semibold tabular-nums text-foreground">
        {formatDuration(secondsRemaining)}
      </p>

      <div className="flex items-center justify-center gap-2">
        {status === 'running' ? (
          <Button variant="outline" size="sm" onClick={pause}>
            <Pause className="h-3.5 w-3.5" />
            {t.pomodoro.pause}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={resume}>
            <Play className="h-3.5 w-3.5" />
            {t.pomodoro.resume}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={stop}>
          <Square className="h-3.5 w-3.5" />
          {t.pomodoro.stop}
        </Button>
      </div>
    </div>
  )
}
