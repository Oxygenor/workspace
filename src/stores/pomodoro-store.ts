import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PomodoroPhase = 'work' | 'short-break' | 'long-break'
export type PomodoroStatus = 'idle' | 'running' | 'paused'

export interface PomodoroTarget {
  cardId?: string
  taskId?: string
  title: string
}

interface PomodoroSettings {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsUntilLongBreak: number
}

interface PomodoroState extends PomodoroSettings {
  status: PomodoroStatus
  phase: PomodoroPhase
  secondsRemaining: number
  completedWorkSessions: number
  target: PomodoroTarget | null
  /** id of the currently-open `time_entries` row for the active work phase, if any. */
  timeEntryId: string | null

  startWork: (target: PomodoroTarget) => void
  pause: () => void
  resume: () => void
  stop: () => void
  tick: () => void
  setTimeEntryId: (id: string | null) => void
  beginBreak: (phase: 'short-break' | 'long-break') => void
  finishBreak: () => void
  updateSettings: (patch: Partial<PomodoroSettings>) => void
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      status: 'idle',
      phase: 'work',
      secondsRemaining: DEFAULT_SETTINGS.workMinutes * 60,
      completedWorkSessions: 0,
      target: null,
      timeEntryId: null,

      startWork: (target) =>
        set({
          status: 'running',
          phase: 'work',
          secondsRemaining: get().workMinutes * 60,
          target,
        }),

      pause: () => set((state) => (state.status === 'running' ? { status: 'paused' } : state)),
      resume: () => set((state) => (state.status === 'paused' ? { status: 'running' } : state)),

      stop: () =>
        set({
          status: 'idle',
          phase: 'work',
          secondsRemaining: get().workMinutes * 60,
          completedWorkSessions: 0,
          target: null,
          timeEntryId: null,
        }),

      tick: () =>
        set((state) => ({
          secondsRemaining: state.status === 'running' ? Math.max(0, state.secondsRemaining - 1) : state.secondsRemaining,
        })),

      setTimeEntryId: (id) => set({ timeEntryId: id }),

      beginBreak: (phase) =>
        set((state) => ({
          status: 'running',
          phase,
          secondsRemaining: (phase === 'short-break' ? state.shortBreakMinutes : state.longBreakMinutes) * 60,
          completedWorkSessions: state.completedWorkSessions + 1,
          timeEntryId: null,
        })),

      finishBreak: () =>
        set((state) => ({
          status: 'idle',
          phase: 'work',
          secondsRemaining: state.workMinutes * 60,
        })),

      updateSettings: (patch) => set(patch),
    }),
    {
      name: 'workspace-pomodoro-settings',
      partialize: (state) => ({
        workMinutes: state.workMinutes,
        shortBreakMinutes: state.shortBreakMinutes,
        longBreakMinutes: state.longBreakMinutes,
        sessionsUntilLongBreak: state.sessionsUntilLongBreak,
      }),
    },
  ),
)
