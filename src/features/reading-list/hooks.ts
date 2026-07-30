import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createReadingListItem,
  deleteReadingListItem,
  fetchLinkMetadata,
  fetchReadingListItems,
  updateReadingListItem,
  type UpdateReadingListItemInput,
} from './api'

// Not part of the shared `queryKeys` registry (`src/lib/query/keys.ts`) —
// that file is owned by the orchestrator wiring this feature in, so this
// feature keeps its own local, self-contained key instead.
const readingListItemsKey = (listId: string) => ['reading-list-items', listId] as const

export function useReadingListItems(listId: string) {
  return useQuery({
    queryKey: readingListItemsKey(listId),
    queryFn: () => fetchReadingListItems(listId),
  })
}

export function useCreateReadingListItem(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ url, position }: { url: string; position: number }) =>
      createReadingListItem(listId, url, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: readingListItemsKey(listId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateReadingListItem(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateReadingListItemInput }) =>
      updateReadingListItem(itemId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: readingListItemsKey(listId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteReadingListItem(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteReadingListItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: readingListItemsKey(listId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

/**
 * Resolves title/favicon for a freshly-added link via the edge function and
 * patches the row once it settles. Deliberately silent on failure (no
 * toast) — a link that fails to resolve metadata just keeps showing its raw
 * URL, which is a perfectly usable fallback, not an error worth interrupting
 * the user over. Callers drive their own per-row "fetching" indicator off of
 * this mutation's `isPending` (or their own tracked id set), not off of
 * `title === null`, since a failed resolution also leaves `title` null.
 */
export function useResolveReadingListItemMetadata(listId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, url }: { itemId: string; url: string }) => {
      const metadata = await fetchLinkMetadata(url)
      return updateReadingListItem(itemId, { title: metadata.title, favicon_url: metadata.faviconUrl })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: readingListItemsKey(listId) }),
  })
}
