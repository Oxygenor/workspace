import { useState } from 'react'
import { ArrowDownAZ, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateItemSettings } from '@/features/workspace-tree/hooks'
import { useKanbanFiltersStore } from '@/stores/kanban-filters-store'
import { t } from '@/i18n'
import type { WorkspaceItemRow } from '@/types/database'
import { BoardFilters } from './BoardFilters'

interface BoardHeaderProps {
  item: WorkspaceItemRow
}

export function BoardHeader({ item }: BoardHeaderProps) {
  const updateSettings = useUpdateItemSettings()
  const search = useKanbanFiltersStore((s) => s.searchByBoard[item.id] ?? '')
  const setSearch = useKanbanFiltersStore((s) => s.setSearch)
  const sort = useKanbanFiltersStore((s) => s.sortByBoard[item.id] ?? 'manual')
  const setSort = useKanbanFiltersStore((s) => s.setSort)

  const description = typeof item.settings.description === 'string' ? item.settings.description : ''
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [draftDescription, setDraftDescription] = useState(description)

  function commitDescription() {
    setIsEditingDescription(false)
    if (draftDescription !== description) {
      updateSettings.mutate({ itemId: item.id, settings: { ...item.settings, description: draftDescription } })
    }
  }

  return (
    <div className="space-y-3">
      {isEditingDescription ? (
        <Input
          autoFocus
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          onBlur={commitDescription}
          onKeyDown={(e) => e.key === 'Enter' && commitDescription()}
          placeholder={t.common.description}
        />
      ) : (
        <p
          className="cursor-text text-sm text-muted-foreground"
          onClick={() => {
            setDraftDescription(description)
            setIsEditingDescription(true)
          }}
        >
          {description || `${t.common.description} (${t.common.optional})`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(item.id, e.target.value)}
            placeholder={t.common.search}
            className="h-8 pl-8"
          />
        </div>

        <BoardFilters boardId={item.id} />

        <Select value={sort} onValueChange={(value) => setSort(item.id, value as typeof sort)}>
          <SelectTrigger className="h-8 w-40">
            <ArrowDownAZ className="h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">{t.kanban.sort}</SelectItem>
            <SelectItem value="due">{t.card.dueDate}</SelectItem>
            <SelectItem value="priority">{t.card.priority}</SelectItem>
            <SelectItem value="title">{t.common.name}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
