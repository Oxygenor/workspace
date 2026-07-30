import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/use-auth'
import { fetchMyAssignedCards, fetchOverdueCards, fetchUpcomingCardDeadlines } from './api'

export function useMyAssignedCards() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['home', 'assigned-cards', user?.id],
    queryFn: () => fetchMyAssignedCards(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useUpcomingCardDeadlines() {
  return useQuery({ queryKey: ['home', 'upcoming-deadlines'], queryFn: () => fetchUpcomingCardDeadlines() })
}

export function useOverdueCards() {
  return useQuery({ queryKey: ['home', 'overdue-cards'], queryFn: () => fetchOverdueCards() })
}
