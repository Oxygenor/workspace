import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { t } from '@/i18n'
import type { KanbanColumnRow } from '@/types/database'
import type { KanbanCardSummary } from './types'
import {
  addCardDependency,
  archiveCard,
  archiveColumn,
  createCard,
  createColumn,
  createLabel,
  deleteCard,
  deleteColumn,
  deleteLabel,
  fetchBoardLabels,
  fetchCardDependencies,
  fetchColumns,
  fetchKanbanCards,
  moveCard,
  removeCardDependency,
  renameColumn,
  reorderCard,
  reorderColumn,
  restoreCard,
  restoreColumn,
  updateColumnAutoArchive,
  updateColumnColor,
  updateColumnInProgress,
  updateColumnResetTarget,
  updateColumnWipLimit,
} from './api'

export function useColumns(boardId: string) {
  return useQuery({ queryKey: queryKeys.kanbanColumns(boardId), queryFn: () => fetchColumns(boardId) })
}

export function useKanbanCards(boardId: string) {
  return useQuery({ queryKey: queryKeys.kanbanCards(boardId), queryFn: () => fetchKanbanCards(boardId) })
}

export function useBoardLabels(boardId: string) {
  return useQuery({ queryKey: queryKeys.boardLabels(boardId), queryFn: () => fetchBoardLabels(boardId) })
}

export function useCreateColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, position }: { name: string; position: number }) => createColumn(boardId, name, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useRenameColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, name }: { columnId: string; name: string }) => renameColumn(columnId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateColumnColor(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, color }: { columnId: string; color: string }) => updateColumnColor(columnId, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateColumnWipLimit(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, wipLimit }: { columnId: string; wipLimit: number | null }) =>
      updateColumnWipLimit(columnId, wipLimit),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateColumnAutoArchive(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      columnId,
      isDoneColumn,
      autoArchiveDays,
    }: {
      columnId: string
      isDoneColumn: boolean
      autoArchiveDays: number
    }) => updateColumnAutoArchive(columnId, isDoneColumn, autoArchiveDays),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateColumnInProgress(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, isInProgressColumn }: { columnId: string; isInProgressColumn: boolean }) =>
      updateColumnInProgress(columnId, isInProgressColumn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) })
      queryClient.invalidateQueries({ queryKey: ['home', 'board-overview'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateColumnResetTarget(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, isResetTargetColumn }: { columnId: string; isResetTargetColumn: boolean }) =>
      updateColumnResetTarget(columnId, isResetTargetColumn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) })
      queryClient.invalidateQueries({ queryKey: ['home', 'board-overview'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useReorderColumn(boardId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.kanbanColumns(boardId)
  return useMutation({
    mutationFn: ({ columnId, position }: { columnId: string; position: number }) => reorderColumn(columnId, position),
    onMutate: async ({ columnId, position }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<KanbanColumnRow[]>(key)
      queryClient.setQueryData<KanbanColumnRow[]>(key, (old) =>
        old ? old.map((c) => (c.id === columnId ? { ...c, position } : c)).sort((a, b) => a.position - b.position) : old,
      )
      return { previous }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useArchiveColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (columnId: string) => archiveColumn(columnId),
    onSuccess: (_data, columnId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) })
      toast.success(t.undo.archived, {
        action: {
          label: t.undo.actionLabel,
          onClick: () => {
            restoreColumn(columnId)
              .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) }))
              .catch((error: Error) => toast.error(error.message))
          },
        },
      })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (columnId: string) => deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanColumns(boardId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) })
      toast.success('Колонку видалено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCreateCard(boardId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, title, position }: { columnId: string; title: string; position: number }) =>
      createCard({ boardId, columnId, title, position, createdBy: user!.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useReorderCard(boardId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.kanbanCards(boardId)
  return useMutation({
    mutationFn: ({ cardId, position }: { cardId: string; position: number }) => reorderCard(cardId, position),
    onMutate: async ({ cardId, position }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<KanbanCardSummary[]>(key)
      if (previous) {
        queryClient.setQueryData<KanbanCardSummary[]>(
          key,
          previous.map((c) => (c.id === cardId ? { ...c, position } : c)),
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

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.kanbanCards(boardId)
  return useMutation({
    mutationFn: ({ cardId, newColumnId, newPosition }: { cardId: string; newColumnId: string; newPosition: number }) =>
      moveCard(cardId, newColumnId, newPosition),
    onMutate: async ({ cardId, newColumnId, newPosition }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<KanbanCardSummary[]>(key)
      if (previous) {
        queryClient.setQueryData<KanbanCardSummary[]>(
          key,
          previous.map((c) => (c.id === cardId ? { ...c, column_id: newColumnId, position: newPosition } : c)),
        )
      }
      return { previous }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      // Moving a card may have started/stopped a running timer server-side
      // (move_kanban_card RPC, for in-progress/done columns) — refresh timer state too.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]
          return key === 'running-timer' || key === 'time-entries' || key === 'time-entries-total'
        },
      })
      // A card may have entered/left an in-progress or reset-target column —
      // refresh the Home page's cross-board overview too.
      queryClient.invalidateQueries({ queryKey: ['home', 'board-overview'] })
    },
  })
}

export function useArchiveCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) => archiveCard(cardId),
    onSuccess: (_data, cardId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) })
      toast.success(t.undo.archived, {
        action: {
          label: t.undo.actionLabel,
          onClick: () => {
            restoreCard(cardId)
              .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) }))
              .catch((error: Error) => toast.error(error.message))
          },
        },
      })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) })
      toast.success('Картку видалено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCreateLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createLabel(boardId, name, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.boardLabels(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCardDependencies(boardId: string) {
  return useQuery({ queryKey: queryKeys.cardDependencies(boardId), queryFn: () => fetchCardDependencies(boardId) })
}

export function useAddCardDependency(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, dependsOnCardId }: { cardId: string; dependsOnCardId: string }) =>
      addCardDependency(cardId, dependsOnCardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cardDependencies(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useRemoveCardDependency(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, dependsOnCardId }: { cardId: string; dependsOnCardId: string }) =>
      removeCardDependency(cardId, dependsOnCardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cardDependencies(boardId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteLabel(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (labelId: string) => deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boardLabels(boardId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
