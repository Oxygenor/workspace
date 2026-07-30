import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import type { CalendarEventInput } from './api'
import {
  createEvent,
  deleteEvent,
  fetchDeadlineCards,
  fetchDeadlineTasks,
  fetchEvents,
  updateEvent,
} from './api'

export function useCalendarEvents(calendarId: string) {
  return useQuery({ queryKey: queryKeys.calendarEvents(calendarId), queryFn: () => fetchEvents(calendarId) })
}

export function useCreateEvent(calendarId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CalendarEventInput) => createEvent(calendarId, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents(calendarId) })
      toast.success('Подію створено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateEvent(calendarId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: Partial<CalendarEventInput> }) =>
      updateEvent(eventId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents(calendarId) })
      toast.success('Подію оновлено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteEvent(calendarId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarEvents(calendarId) })
      toast.success('Подію видалено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeadlineCards() {
  return useQuery({ queryKey: queryKeys.deadlineCards(), queryFn: fetchDeadlineCards })
}

export function useDeadlineTasks() {
  return useQuery({ queryKey: queryKeys.deadlineTasks(), queryFn: fetchDeadlineTasks })
}
