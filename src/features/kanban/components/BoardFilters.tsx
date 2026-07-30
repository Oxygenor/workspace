import { Filter, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentWorkspace, useWorkspaceMembers } from '@/features/workspace/hooks'
import { useKanbanFiltersStore } from '@/stores/kanban-filters-store'
import { t } from '@/i18n'
import { PRIORITY_LABELS, PRIORITY_ORDER } from '../priority'
import { EMPTY_FILTERS } from '../types'
import { useBoardLabels } from '../hooks'

interface BoardFiltersProps {
  boardId: string
}

export function BoardFilters({ boardId }: BoardFiltersProps) {
  const { workspace } = useCurrentWorkspace()
  const { data: members } = useWorkspaceMembers(workspace?.id)
  const { data: labels } = useBoardLabels(boardId)
  const filters = useKanbanFiltersStore((s) => s.filtersByBoard[boardId] ?? EMPTY_FILTERS)
  const setFilter = useKanbanFiltersStore((s) => s.setFilter)
  const clearFilters = useKanbanFiltersStore((s) => s.clearFilters)

  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-3.5 w-3.5" />
          {t.kanban.filters}
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeCount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="start">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t.kanban.assignee}</label>
          <Select
            value={filters.assigneeId ?? '__all__'}
            onValueChange={(value) => setFilter(boardId, { assigneeId: value === '__all__' ? null : value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.common.search}</SelectItem>
              {members?.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name ?? '—'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t.kanban.priority}</label>
          <Select
            value={filters.priority ?? '__all__'}
            onValueChange={(value) => setFilter(boardId, { priority: value === '__all__' ? null : value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.common.search}</SelectItem>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t.kanban.label}</label>
          <Select
            value={filters.labelId ?? '__all__'}
            onValueChange={(value) => setFilter(boardId, { labelId: value === '__all__' ? null : value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.common.search}</SelectItem>
              {labels?.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t.card.dueDate}</label>
          <Select
            value={filters.dueFilter ?? '__all__'}
            onValueChange={(value) =>
              setFilter(boardId, { dueFilter: value === '__all__' ? null : (value as typeof filters.dueFilter) })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.common.search}</SelectItem>
              <SelectItem value="overdue">{t.kanban.overdue}</SelectItem>
              <SelectItem value="no-due-date">{t.kanban.noDueDate}</SelectItem>
              <SelectItem value="completed">{t.kanban.completed}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => clearFilters(boardId)}>
            <X className="h-3.5 w-3.5" />
            {t.kanban.clearFilters}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
