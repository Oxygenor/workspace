import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { fetchBacklinks, fetchDocument, syncNoteLinks, updateDocument } from './api'

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
