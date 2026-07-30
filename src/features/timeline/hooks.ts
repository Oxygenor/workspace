import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query/keys'
import type { WorkspaceItemRow } from '@/types/database'
import { fetchTimelineEntries, type TimelineEntry } from './api'

interface UseTimelineEntriesResult {
  data: TimelineEntry[]
  isLoading: boolean
}

/**
 * Loads the timeline entries (kanban cards / tasks with a due date) for the
 * given DIRECT child items of a section — see `fetchTimelineEntries` for the
 * scope limitation. Skips the network round-trip entirely when none of the
 * children are a kanban board or a task list.
 */
export function useTimelineEntries(childItems: WorkspaceItemRow[]): UseTimelineEntriesResult {
  const relevantItemIds = childItems
    .filter((item) => item.type === 'kanban' || item.type === 'task_list')
    .map((item) => item.id)
    .sort()
  const hasRelevantChildren = relevantItemIds.length > 0

  const query = useQuery({
    queryKey: queryKeys.timelineEntries(relevantItemIds),
    queryFn: () => fetchTimelineEntries(childItems),
    enabled: hasRelevantChildren,
  })

  if (!hasRelevantChildren) {
    return { data: [], isLoading: false }
  }

  return { data: query.data ?? [], isLoading: query.isLoading }
}
