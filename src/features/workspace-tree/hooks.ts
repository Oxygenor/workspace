import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { logActivity } from '@/lib/activity'
import { useAuth } from '@/features/auth/use-auth'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import { t } from '@/i18n'
import type { ItemType, WorkspaceItemRow } from '@/types/database'
import {
  archiveWorkspaceItem,
  createWorkspaceItem,
  deleteWorkspaceItem,
  duplicateWorkspaceItem,
  fetchArchivedItems,
  fetchWorkspaceItems,
  moveWorkspaceItem,
  renameWorkspaceItem,
  restoreWorkspaceItem,
  updateItemColor,
  updateItemIcon,
  updateItemSettings,
} from './api'

export function useWorkspaceItems() {
  const { workspace } = useCurrentWorkspace()

  return useQuery({
    queryKey: queryKeys.workspaceItems(workspace?.id),
    queryFn: () => fetchWorkspaceItems(workspace!.id),
    enabled: Boolean(workspace?.id),
  })
}

export function useArchivedItems() {
  const { workspace } = useCurrentWorkspace()

  return useQuery({
    queryKey: [...queryKeys.workspaceItems(workspace?.id), 'archived'],
    queryFn: () => fetchArchivedItems(workspace!.id),
    enabled: Boolean(workspace?.id),
  })
}

export function useCreateItem() {
  const { workspace } = useCurrentWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { type: ItemType; name: string; parentId: string | null; position: number }) =>
      createWorkspaceItem({
        workspaceId: workspace!.id,
        parentId: input.parentId,
        type: input.type,
        name: input.name,
        position: input.position,
        createdBy: user!.id,
      }),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
      logActivity(workspace?.id, user?.id, 'workspace_item', item.id, 'created', { name: item.name, type: item.type })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useRenameItem() {
  const { workspace } = useCurrentWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, name }: { itemId: string; name: string }) => renameWorkspaceItem(itemId, name),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
      queryClient.setQueryData(queryKeys.workspaceItem(item.id), item)
      logActivity(workspace?.id, user?.id, 'workspace_item', item.id, 'renamed', { name: item.name })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateItemIcon() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, icon }: { itemId: string; icon: string }) => updateItemIcon(itemId, icon),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateItemColor() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, color }: { itemId: string; color: string }) => updateItemColor(itemId, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateItemSettings() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, settings }: { itemId: string; settings: Record<string, unknown> }) =>
      updateItemSettings(itemId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDuplicateItem() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ item, position }: { item: WorkspaceItemRow; position: number }) =>
      duplicateWorkspaceItem(item, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
      toast.success('Елемент дубльовано')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useArchiveItem() {
  const { workspace } = useCurrentWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => archiveWorkspaceItem(itemId),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
      toast.success(t.undo.archived, {
        action: {
          label: t.undo.actionLabel,
          onClick: () => {
            restoreWorkspaceItem(item.id)
              .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) }))
              .catch((error: Error) => toast.error(error.message))
          },
        },
      })
      logActivity(workspace?.id, user?.id, 'workspace_item', item.id, 'archived', { name: item.name })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useRestoreItem() {
  const { workspace } = useCurrentWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => restoreWorkspaceItem(itemId),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
      toast.success('Елемент відновлено')
      logActivity(workspace?.id, user?.id, 'workspace_item', item.id, 'restored', { name: item.name })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteItem() {
  const { workspace } = useCurrentWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = queryKeys.workspaceItems(workspace?.id)

  return useMutation({
    mutationFn: (itemId: string) => deleteWorkspaceItem(itemId),
    onMutate: (itemId) => {
      const cached = queryClient.getQueryData<WorkspaceItemRow[]>(key)
      return { name: cached?.find((i) => i.id === itemId)?.name ?? null }
    },
    onSuccess: (_data, itemId, context) => {
      queryClient.invalidateQueries({ queryKey: key })
      toast.success('Елемент видалено назавжди')
      logActivity(workspace?.id, user?.id, 'workspace_item', itemId, 'deleted', { name: context?.name })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useMoveItem() {
  const { workspace } = useCurrentWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = queryKeys.workspaceItems(workspace?.id)

  return useMutation({
    mutationFn: ({ itemId, newParentId, newPosition }: { itemId: string; newParentId: string | null; newPosition: number }) =>
      moveWorkspaceItem(itemId, newParentId, newPosition),
    onMutate: async ({ itemId, newParentId, newPosition }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<WorkspaceItemRow[]>(key)
      if (previous) {
        queryClient.setQueryData<WorkspaceItemRow[]>(
          key,
          previous.map((item) =>
            item.id === itemId ? { ...item, parent_id: newParentId, position: newPosition } : item,
          ),
        )
      }
      return { previous }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
      toast.error(error.message)
    },
    onSuccess: (_data, { itemId }) => {
      logActivity(workspace?.id, user?.id, 'workspace_item', itemId, 'moved')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
