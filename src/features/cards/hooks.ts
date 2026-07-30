import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import type { PriorityLevel } from '@/types/database'
import {
  addCardLabel,
  createChecklistItem,
  createComment,
  deleteAttachment,
  deleteChecklistItem,
  deleteComment,
  fetchAttachments,
  fetchCard,
  fetchCardLabelIds,
  fetchChecklistItems,
  fetchComments,
  removeCardLabel,
  updateCard,
  updateChecklistItem,
  updateComment,
  uploadAttachment,
  type UpdateCardInput,
} from './api'

function invalidateCard(queryClient: ReturnType<typeof useQueryClient>, cardId: string, boardId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCard(cardId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) })
}

export function useCard(cardId: string) {
  return useQuery({ queryKey: queryKeys.kanbanCard(cardId), queryFn: () => fetchCard(cardId) })
}

export function useUpdateCard(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCardInput) => updateCard(cardId, input),
    onSuccess: () => invalidateCard(queryClient, cardId, boardId),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCardLabelIds(cardId: string) {
  return useQuery({ queryKey: queryKeys.cardLabels(cardId), queryFn: () => fetchCardLabelIds(cardId) })
}

export function useToggleCardLabel(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ labelId, isAssigned }: { labelId: string; isAssigned: boolean }) => {
      if (isAssigned) {
        await removeCardLabel(cardId, labelId)
      } else {
        await addCardLabel(cardId, labelId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardLabels(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useChecklistItems(cardId: string) {
  return useQuery({ queryKey: queryKeys.cardChecklist(cardId), queryFn: () => fetchChecklistItems(cardId) })
}

export function useCreateChecklistItem(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ title, position }: { title: string; position: number }) => createChecklistItem(cardId, title, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardChecklist(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateChecklistItem(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      itemId: string
      input: { title?: string; completed?: boolean; position?: number }
    }) => updateChecklistItem(itemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardChecklist(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteChecklistItem(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteChecklistItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardChecklist(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useComments(cardId: string) {
  return useQuery({ queryKey: queryKeys.cardComments(cardId), queryFn: () => fetchComments(cardId) })
}

export function useCreateComment(cardId: string, boardId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => createComment(cardId, user!.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardComments(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateComment(cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) => updateComment(commentId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cardComments(cardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteComment(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardComments(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useAttachments(cardId: string) {
  return useQuery({ queryKey: queryKeys.cardAttachments(cardId), queryFn: () => fetchAttachments(cardId) })
}

export function useUploadAttachment(cardId: string, boardId: string) {
  const { user } = useAuth()
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(workspace!.id, cardId, user!.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardAttachments(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteAttachment(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ attachmentId, storagePath }: { attachmentId: string; storagePath: string }) =>
      deleteAttachment(attachmentId, storagePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardAttachments(cardId) })
      invalidateCard(queryClient, cardId, boardId)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export type { PriorityLevel }
