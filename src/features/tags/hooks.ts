import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import { t } from '@/i18n'
import {
  attachTag,
  createTag,
  deleteTag,
  detachTag,
  fetchTagIdsForTarget,
  fetchTagLinkCounts,
  fetchTagWithLinkedEntities,
  fetchWorkspaceTags,
  mergeTags,
  type TagTarget,
} from './api'

function targetKey({ itemId, cardId, taskId }: TagTarget): string | undefined {
  return itemId ?? cardId ?? taskId
}

export function useWorkspaceTags() {
  const { workspace } = useCurrentWorkspace()
  return useQuery({
    queryKey: queryKeys.tags(workspace?.id),
    queryFn: () => fetchWorkspaceTags(workspace!.id),
    enabled: Boolean(workspace),
  })
}

export function useCreateTag() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createTag(workspace!.id, name, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tags(workspace?.id) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTag() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tagId: string) => deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags(workspace?.id) })
      queryClient.invalidateQueries({ queryKey: ['tag-links'] })
      queryClient.invalidateQueries({ queryKey: ['tag-detail'] })
      toast.success('Тег видалено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useMergeTags() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceTagId, targetTagId }: { sourceTagId: string; targetTagId: string }) =>
      mergeTags(sourceTagId, targetTagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags(workspace?.id) })
      queryClient.invalidateQueries({ queryKey: ['tag-links'] })
      queryClient.invalidateQueries({ queryKey: ['tag-detail'] })
      queryClient.invalidateQueries({ queryKey: ['tag-link-counts'] })
      toast.success(t.tagsMerge.success)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useTagIdsForTarget(target: TagTarget) {
  const key = targetKey(target)
  return useQuery({
    queryKey: queryKeys.tagLinks(key),
    queryFn: () => fetchTagIdsForTarget(target),
    enabled: Boolean(key),
  })
}

export function useToggleTag(target: TagTarget) {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const key = targetKey(target)
  return useMutation({
    mutationFn: ({ tagId, isAttached }: { tagId: string; isAttached: boolean }) =>
      isAttached ? detachTag({ tagId, ...target }) : attachTag({ tagId, ...target }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tagLinks(key) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tags(workspace?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useTagLinkCounts(tagIds: string[]) {
  const sortedIds = [...tagIds].sort()
  return useQuery({
    queryKey: ['tag-link-counts', sortedIds] as const,
    queryFn: () => fetchTagLinkCounts(tagIds),
    enabled: tagIds.length > 0,
  })
}

export function useTagWithLinkedEntities(tagId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tagDetail(tagId),
    queryFn: () => fetchTagWithLinkedEntities(tagId!),
    enabled: Boolean(tagId),
  })
}
