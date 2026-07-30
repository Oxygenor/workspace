import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import {
  deleteTimeEntry,
  fetchEntriesForTarget,
  fetchRunningTimer,
  fetchTotalSecondsForTarget,
  startTimer,
  stopTimer,
} from './api'
import type { TimeTarget } from './api'

export { formatDuration } from './format'

export function useRunningTimer() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.runningTimer(user?.id),
    queryFn: () => fetchRunningTimer(user!.id),
    enabled: Boolean(user),
  })
}

export function useEntriesForTarget({ cardId, taskId }: TimeTarget) {
  return useQuery({
    queryKey: queryKeys.timeEntries(cardId, taskId),
    queryFn: () => fetchEntriesForTarget({ cardId, taskId }),
    enabled: Boolean(cardId || taskId),
  })
}

export function useTotalSecondsForTarget({ cardId, taskId }: TimeTarget) {
  return useQuery({
    queryKey: queryKeys.timeEntriesTotal(cardId, taskId),
    queryFn: () => fetchTotalSecondsForTarget({ cardId, taskId }),
    enabled: Boolean(cardId || taskId),
  })
}

export function useStartTimer() {
  const { user } = useAuth()
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cardId, taskId }: TimeTarget) =>
      startTimer({ workspaceId: workspace!.id, userId: user!.id, cardId, taskId }),
    onSuccess: (_entry, { cardId, taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runningTimer(user?.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries(cardId, taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntriesTotal(cardId, taskId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useStopTimer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (entryId: string) => stopTimer(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runningTimer(user?.id) })
      // Precise invalidation would need the entry's card/task id; broadly invalidating
      // every time-entries query is simple and correct for a personal, low-volume feature.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]
          return key === 'time-entries' || key === 'time-entries-total'
        },
      })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTimeEntry({ cardId, taskId }: TimeTarget) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (entryId: string) => deleteTimeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries(cardId, taskId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntriesTotal(cardId, taskId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
