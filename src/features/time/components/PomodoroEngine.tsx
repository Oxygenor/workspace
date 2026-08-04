import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { t } from '@/i18n'
import { useAuth } from '@/features/auth/use-auth'
import { useSetPomodoroBreakUntil } from '@/features/schedule/hooks'
import { usePomodoroStore } from '@/stores/pomodoro-store'
import { playChime } from '../sound'
import { useStartTimer, useStopTimer } from '../hooks'

function isBreakPhase(phase: string): boolean {
  return phase === 'short-break' || phase === 'long-break'
}

function notify(title: string, body: string) {
  toast(body)
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

/**
 * Drives the global Pomodoro countdown independent of whichever page/dialog
 * is open — mounted once in AppLayout. Work phases are backed by a real
 * `time_entries` row (via the same start/stop mutations free-form tracking
 * uses), so completed Pomodoro sessions show up in Time Report/Weekly
 * Review automatically. Breaks are intentionally NOT logged as tracked time.
 */
export function PomodoroEngine() {
  const status = usePomodoroStore((s) => s.status)
  const phase = usePomodoroStore((s) => s.phase)
  const secondsRemaining = usePomodoroStore((s) => s.secondsRemaining)
  const target = usePomodoroStore((s) => s.target)
  const timeEntryId = usePomodoroStore((s) => s.timeEntryId)
  const completedWorkSessions = usePomodoroStore((s) => s.completedWorkSessions)
  const sessionsUntilLongBreak = usePomodoroStore((s) => s.sessionsUntilLongBreak)
  const shortBreakMinutes = usePomodoroStore((s) => s.shortBreakMinutes)
  const longBreakMinutes = usePomodoroStore((s) => s.longBreakMinutes)
  const tick = usePomodoroStore((s) => s.tick)
  const setTimeEntryId = usePomodoroStore((s) => s.setTimeEntryId)
  const beginBreak = usePomodoroStore((s) => s.beginBreak)
  const finishBreak = usePomodoroStore((s) => s.finishBreak)

  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const { user } = useAuth()
  const setPomodoroBreakUntil = useSetPomodoroBreakUntil()

  // Open a time_entries row as soon as a work phase starts running.
  useEffect(() => {
    if (status === 'running' && phase === 'work' && !timeEntryId && target) {
      startTimer.mutate(
        { cardId: target.cardId, taskId: target.taskId },
        { onSuccess: (entry) => setTimeEntryId(entry.id) },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, phase, timeEntryId, target])

  // The one-second ticker.
  useEffect(() => {
    if (status !== 'running') return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [status, tick])

  // Push break start/end to the server (`user_schedule_settings.pomodoro_break_until`)
  // so the idle-nudge edge function — which has no access to this client-only
  // store — can tell a legitimate break apart from genuine idleness.
  const prevPhaseRef = useRef(phase)
  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    if (user) {
      if (!isBreakPhase(prevPhase) && isBreakPhase(phase)) {
        const minutes = phase === 'short-break' ? shortBreakMinutes : longBreakMinutes
        setPomodoroBreakUntil.mutate(new Date(Date.now() + minutes * 60 * 1000).toISOString())
      } else if (isBreakPhase(prevPhase) && !isBreakPhase(phase)) {
        setPomodoroBreakUntil.mutate(null)
      }
    }
    prevPhaseRef.current = phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Phase completion.
  useEffect(() => {
    if (status !== 'running' || secondsRemaining > 0) return

    playChime()

    if (phase === 'work') {
      if (timeEntryId) {
        stopTimer.mutate(timeEntryId)
        setTimeEntryId(null)
      }
      notify(t.common.appName, t.pomodoro.workDone)
      const nextIsLong = (completedWorkSessions + 1) % sessionsUntilLongBreak === 0
      beginBreak(nextIsLong ? 'long-break' : 'short-break')
    } else {
      notify(t.common.appName, t.pomodoro.breakDone)
      finishBreak()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, secondsRemaining, phase])

  return null
}
