import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/use-auth'
import { fetchMyAssignedItems, fetchOverdueDeadlines, fetchUpcomingDeadlines } from './api'

export function useMyAssignedItems() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['home', 'assigned-items', user?.id],
    queryFn: () => fetchMyAssignedItems(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useUpcomingDeadlines() {
  return useQuery({ queryKey: ['home', 'upcoming-deadlines'], queryFn: () => fetchUpcomingDeadlines() })
}

export function useOverdueDeadlines() {
  return useQuery({ queryKey: ['home', 'overdue-deadlines'], queryFn: () => fetchOverdueDeadlines() })
}
