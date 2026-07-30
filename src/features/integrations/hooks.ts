import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { fetchUserIntegrations, generateTelegramLinkCode } from './api'

/**
 * `refetchInterval` is opt-in (passed while a link code is being displayed
 * and hasn't been confirmed yet) so we can pick up `telegram_chat_id` being
 * set by the telegram-webhook function without the user manually
 * refreshing the page.
 */
export function useUserIntegrations(pollForLinking = false) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.userIntegrations(user?.id),
    queryFn: () => fetchUserIntegrations(user!.id),
    enabled: Boolean(user?.id),
    refetchInterval: pollForLinking ? 4000 : false,
  })
}

export function useGenerateTelegramCode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => generateTelegramLinkCode(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userIntegrations(user?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
