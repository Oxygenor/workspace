import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import {
  fetchBacklinks,
  fetchDocument,
  fetchPinnedNotes,
  syncNoteLinks,
  updateDocument,
  updateDocumentLock,
  updateDocumentPinned,
  type UpdateDocumentLockInput,
} from './api'

/**
 * Not part of the shared `queryKeys` registry (that file is out of scope for
 * this feature) — kept local since only this feature's hooks read/invalidate it.
 */
const pinnedNotesQueryKey = (workspaceId: string | undefined) => ['pinned-notes', workspaceId] as const

export function useDocument(itemId: string) {
  return useQuery({ queryKey: queryKeys.document(itemId), queryFn: () => fetchDocument(itemId) })
}

export function useUpdateDocument(itemId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: items } = useWorkspaceItems()

  return useMutation({
    mutationFn: (content: string) => updateDocument(itemId, content, user!.id),
    onSuccess: (_data, content) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.document(itemId) })

      // Re-parse [[mentions]] and sync note_links on the same debounced save
      // trigger — no extra debounce needed. Failures here shouldn't surface
      // as a save error, so they're reported separately.
      if (!items) return
      syncNoteLinks(itemId, content, items)
        .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.backlinks(itemId) }))
        .catch((error: Error) => toast.error(error.message))
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useBacklinks(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.backlinks(itemId),
    queryFn: () => fetchBacklinks(itemId!),
    enabled: Boolean(itemId),
  })
}

export function useTogglePinned(itemId: string) {
  const queryClient = useQueryClient()
  const { workspace } = useCurrentWorkspace()

  return useMutation({
    mutationFn: (pinned: boolean) => updateDocumentPinned(itemId, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.document(itemId) })
      queryClient.invalidateQueries({ queryKey: pinnedNotesQueryKey(workspace?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateDocumentLock(itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateDocumentLockInput) => updateDocumentLock(itemId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.document(itemId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

/** All pinned notes across the current workspace, for the Home page section. */
export function usePinnedNotes() {
  const { workspace } = useCurrentWorkspace()

  return useQuery({
    queryKey: pinnedNotesQueryKey(workspace?.id),
    queryFn: () => fetchPinnedNotes(workspace!.id),
    enabled: Boolean(workspace?.id),
  })
}
