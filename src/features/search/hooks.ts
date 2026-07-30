import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query/keys'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { searchCards } from './api'

export function useCardSearch(query: string) {
  const { workspace } = useCurrentWorkspace()
  const { data: items } = useWorkspaceItems()
  const boardIds = (items ?? []).filter((i) => i.type === 'kanban').map((i) => i.id)
  const trimmed = query.trim()

  return useQuery({
    queryKey: queryKeys.search(workspace?.id, trimmed),
    queryFn: () => searchCards(boardIds, trimmed),
    enabled: trimmed.length > 0 && boardIds.length > 0,
  })
}
