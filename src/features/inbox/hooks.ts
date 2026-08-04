import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuth } from '@/features/auth/use-auth'
import { t } from '@/i18n'
import {
  archiveInboxItem,
  convertInboxItemToCard,
  convertInboxItemToTask,
  createInboxItem,
  deleteInboxItem,
  fetchInboxItems,
} from './api'

const inboxKey = (userId: string | undefined) => ['inbox-items', userId] as const

export function useInboxItems() {
  const { user } = useAuth()
  return useQuery({
    queryKey: inboxKey(user?.id),
    queryFn: () => fetchInboxItems(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useCreateInboxItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => createInboxItem(user!.id, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inboxKey(user?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useArchiveInboxItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveInboxItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inboxKey(user?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteInboxItem() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteInboxItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inboxKey(user?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useConvertInboxItemToCard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ item, boardId }: { item: Parameters<typeof convertInboxItemToCard>[0]; boardId: string }) =>
      convertInboxItemToCard(item, boardId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKey(user?.id) })
      toast.success(t.inbox.convertedToCard)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useConvertInboxItemToTask() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ item, taskListId }: { item: Parameters<typeof convertInboxItemToTask>[0]; taskListId: string }) =>
      convertInboxItemToTask(item, taskListId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKey(user?.id) })
      toast.success(t.inbox.convertedToTask)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
