import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { fetchDocument, updateDocument } from './api'

export function useDocument(itemId: string) {
  return useQuery({ queryKey: queryKeys.document(itemId), queryFn: () => fetchDocument(itemId) })
}

export function useUpdateDocument(itemId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => updateDocument(itemId, content, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.document(itemId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}
