import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import type { TaskRow } from '@/types/database'
import { createTask, deleteTask, fetchTasks, reorderTask, updateTask, type UpdateTaskInput } from './api'

export function useTasks(taskListId: string) {
  return useQuery({ queryKey: queryKeys.tasks(taskListId), queryFn: () => fetchTasks(taskListId) })
}

export function useCreateTask(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      title,
      position,
      parentTaskId,
    }: {
      title: string
      position: number
      parentTaskId?: string | null
    }) => createTask(taskListId, title, position, parentTaskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateTask(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) => updateTask(taskId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTask(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) })
      toast.success('Завдання видалено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useReorderTask(taskListId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.tasks(taskListId)
  return useMutation({
    mutationFn: ({ taskId, position }: { taskId: string; position: number }) => reorderTask(taskId, position),
    onMutate: async ({ taskId, position }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskRow[]>(key)
      if (previous) {
        queryClient.setQueryData<TaskRow[]>(
          key,
          previous.map((task) => (task.id === taskId ? { ...task, position } : task)),
        )
      }
      return { previous }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
