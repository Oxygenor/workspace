import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { t } from '@/i18n'
import type { TableFieldType, TaskRow } from '@/types/database'
import {
  addDependency,
  bulkDeleteTasks,
  bulkUpdateTasks,
  createTask,
  createTaskCustomField,
  deleteTask,
  deleteTaskCustomField,
  fetchDependencies,
  fetchTaskCustomFields,
  fetchTaskFieldValues,
  fetchTasks,
  removeDependency,
  reorderTask,
  restoreTask,
  updateTask,
  upsertTaskFieldValue,
  type UpdateTaskInput,
} from './api'

const taskCustomFieldsKey = (taskListId: string) => ['task-custom-fields', taskListId] as const
const taskFieldValuesKey = (taskListId: string) => ['task-field-values', taskListId] as const

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
      dueDate,
    }: {
      title: string
      position: number
      parentTaskId?: string | null
      dueDate?: string | null
    }) => createTask(taskListId, title, position, parentTaskId, dueDate),
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
    onMutate: (taskId) => {
      const cached = queryClient.getQueryData<TaskRow[]>(queryKeys.tasks(taskListId))
      return { deletedTask: cached?.find((task) => task.id === taskId) ?? null }
    },
    onSuccess: (_data, _taskId, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) })
      const deletedTask = context?.deletedTask
      toast.success(t.undo.deleted, {
        action: deletedTask
          ? {
              label: t.undo.actionLabel,
              onClick: () => {
                restoreTask(deletedTask)
                  .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) }))
                  .catch((error: Error) => toast.error(error.message))
              },
            }
          : undefined,
      })
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

export function useBulkUpdateTasks(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskIds, input }: { taskIds: string[]; input: UpdateTaskInput }) => bulkUpdateTasks(taskIds, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useBulkDeleteTasks(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskIds: string[]) => bulkDeleteTasks(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(taskListId) })
      toast.success('Завдання видалено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDependencies(taskListId: string) {
  return useQuery({
    queryKey: queryKeys.taskDependencies(taskListId),
    queryFn: () => fetchDependencies(taskListId),
  })
}

export function useAddDependency(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) =>
      addDependency(taskId, dependsOnTaskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.taskDependencies(taskListId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useRemoveDependency(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) =>
      removeDependency(taskId, dependsOnTaskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.taskDependencies(taskListId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useTaskCustomFields(taskListId: string) {
  return useQuery({
    queryKey: taskCustomFieldsKey(taskListId),
    queryFn: () => fetchTaskCustomFields(taskListId),
  })
}

export function useCreateTaskCustomField(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, fieldType, position }: { name: string; fieldType: TableFieldType; position: number }) =>
      createTaskCustomField(taskListId, name, fieldType, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskCustomFieldsKey(taskListId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTaskCustomField(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) => deleteTaskCustomField(fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskCustomFieldsKey(taskListId) })
      queryClient.invalidateQueries({ queryKey: taskFieldValuesKey(taskListId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useTaskFieldValues(taskListId: string) {
  return useQuery({
    queryKey: taskFieldValuesKey(taskListId),
    queryFn: () => fetchTaskFieldValues(taskListId),
  })
}

export function useUpsertTaskFieldValue(taskListId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, fieldId, value }: { taskId: string; fieldId: string; value: unknown }) =>
      upsertTaskFieldValue(taskId, fieldId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskFieldValuesKey(taskListId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}
