import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import { addFavorite, fetchFavorites, removeFavorite } from './api'

export function useFavorites() {
  const { workspace } = useCurrentWorkspace()

  return useQuery({
    queryKey: queryKeys.favorites(workspace?.id),
    queryFn: () => fetchFavorites(workspace!.id),
    enabled: Boolean(workspace?.id),
  })
}

export function useToggleFavorite() {
  const { user } = useAuth()
  const { workspace } = useCurrentWorkspace()
  const { data: favorites } = useFavorites()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const isFavorite = favorites?.some((f) => f.item_id === itemId)
      if (isFavorite) {
        await removeFavorite(itemId, user!.id)
      } else {
        await addFavorite(workspace!.id, user!.id, itemId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites(workspace?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
