import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import {
  addDateException,
  fetchDaysOff,
  fetchScheduleSettings,
  removeDateException,
  setWeekdayOff,
  updateScheduleSettings,
  type ScheduleSettingsUpdate,
} from './api'

export function useScheduleSettings() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.scheduleSettings(user?.id),
    queryFn: () => fetchScheduleSettings(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useUpdateScheduleSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (update: ScheduleSettingsUpdate) => updateScheduleSettings(user!.id, update),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.scheduleSettings(user?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDaysOff() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.daysOff(user?.id),
    queryFn: () => fetchDaysOff(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useSetWeekdayOff() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ weekday, isOff }: { weekday: number; isOff: boolean }) => setWeekdayOff(user!.id, weekday, isOff),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.daysOff(user?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useAddDateException() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ date, isWorking }: { date: string; isWorking: boolean }) =>
      addDateException(user!.id, date, isWorking),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.daysOff(user?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useRemoveDateException() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeDateException(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.daysOff(user?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}
