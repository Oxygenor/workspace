import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { fetchMyDay, fetchUpcomingDeadlines, toggleTaskCompleted } from './api'

const MY_DAY_KEY = ['home', 'my-day']

export function useMyDay() {
  return useQuery({ queryKey: MY_DAY_KEY, queryFn: fetchMyDay })
}

export function useUpcomingDeadlines() {
  return useQuery({ queryKey: ['home', 'upcoming-deadlines'], queryFn: () => fetchUpcomingDeadlines() })
}

export function useToggleTaskCompleted() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean; taskListId: string }) =>
      toggleTaskCompleted(taskId, completed),
    onSuccess: (_data, { taskListId }) => {
      queryClient.invalidateQueries({ queryKey: MY_DAY_KEY })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
