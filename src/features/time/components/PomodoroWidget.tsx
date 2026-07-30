import { Pause, Play, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import { usePomodoroStore } from '@/stores/pomodoro-store'
import { formatDuration } from '../format'

/** Persistent topbar pill for an active Pomodoro session — hidden when idle. */
export function PomodoroWidget() {
  const status = usePomodoroStore((s) => s.status)
  const phase = usePomodoroStore((s) => s.phase)
  const secondsRemaining = usePomodoroStore((s) => s.secondsRemaining)
  const target = usePomodoroStore((s) => s.target)
  const pause = usePomodoroStore((s) => s.pause)
  const resume = usePomodoroStore((s) => s.resume)
  const stop = usePomodoroStore((s) => s.stop)

  if (status === 'idle') return null

  return (
    <div
      className={cn(
        'flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm',
        phase === 'work' ? 'border-primary/40 bg-primary/10 text-primary' : 'border-input bg-background text-foreground',
      )}
    >
      <span className="flex items-center gap-1.5" title={target?.title}>
        <span className="hidden max-w-[8rem] truncate sm:inline">
          {phase === 'work' ? t.pomodoro.work : phase === 'short-break' ? t.pomodoro.shortBreak : t.pomodoro.longBreak}
        </span>
        <span className="tabular-nums font-medium">{formatDuration(secondsRemaining)}</span>
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        aria-label={status === 'running' ? t.pomodoro.pause : t.pomodoro.resume}
        onClick={() => (status === 'running' ? pause() : resume())}
      >
        {status === 'running' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label={t.pomodoro.stop} onClick={stop}>
        <Square className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
