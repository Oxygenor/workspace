import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query/keys'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import { fetchRecentActivity } from './api'

export function useRecentActivity(limit = 15) {
  const { workspace } = useCurrentWorkspace()

  return useQuery({
    queryKey: queryKeys.activityLog(workspace?.id),
    queryFn: () => fetchRecentActivity(workspace!.id, limit),
    enabled: Boolean(workspace?.id),
  })
}
