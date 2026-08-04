import { useQuery } from '@tanstack/react-query'
import { subDays } from 'date-fns'

import { useAuth } from '@/features/auth/use-auth'
import {
  fetchClosedCardsThisWeek,
  fetchCompletedTasksThisWeek,
  fetchTimeReport,
  getPeriodRange,
} from './api'
import type { TimeReportPeriod } from './api'

export function useTimeReport(period: TimeReportPeriod) {
  const { user } = useAuth()
  const { start, end } = getPeriodRange(period)

  return useQuery({
    queryKey: ['reports', 'time', user?.id, period, start.toISOString(), end.toISOString()],
    queryFn: () => fetchTimeReport(user!.id, start, end),
    enabled: Boolean(user),
  })
}

const WEEKLY_TIME_WINDOW_DAYS = 7

export function useWeeklyTimeSummary() {
  const { user } = useAuth()
  const end = new Date()
  const start = subDays(end, WEEKLY_TIME_WINDOW_DAYS)

  return useQuery({
    queryKey: ['reports', 'weekly-time', user?.id],
    queryFn: () => fetchTimeReport(user!.id, start, end),
    enabled: Boolean(user),
  })
}

export function useCompletedTasksThisWeek() {
  return useQuery({
    queryKey: ['reports', 'completed-tasks'],
    queryFn: () => fetchCompletedTasksThisWeek(),
  })
}

export function useClosedCardsThisWeek() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['reports', 'closed-cards', user?.id],
    queryFn: () => fetchClosedCardsThisWeek(),
    enabled: Boolean(user),
  })
}
