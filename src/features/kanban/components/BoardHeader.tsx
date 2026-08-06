import { useState } from 'react'
import { ArrowDownAZ, CheckSquare, CloudDownload, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useUpdateItemSettings } from '@/features/workspace-tree/hooks'
import { useKanbanFiltersStore } from '@/stores/kanban-filters-store'
import { t } from '@/i18n'
import type { WorkspaceItemRow } from '@/types/database'
import { useTriggerQplazeSync } from '../hooks'
import { BoardFilters } from './BoardFilters'

interface BoardHeaderProps {
  item: WorkspaceItemRow
  selectMode: boolean
  onToggleSelectMode: () => void
}

export function BoardHeader({ item, selectMode, onToggleSelectMode }: BoardHeaderProps) {
  const updateSettings = useUpdateItemSettings()
  const search = useKanbanFiltersStore((s) => s.searchByBoard[item.id] ?? '')
  const setSearch = useKanbanFiltersStore((s) => s.setSearch)
  const sort = useKanbanFiltersStore((s) => s.sortByBoard[item.id] ?? 'manual')
  const setSort = useKanbanFiltersStore((s) => s.setSort)
  const triggerQplazeSync = useTriggerQplazeSync(item.id)
  const qplazeSyncEnabled = item.settings.qplazeSyncEnabled === true

  const description = typeof item.settings.description === 'string' ? item.settings.description : ''
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [draftDescription, setDraftDescription] = useState(description)
  const notifyAllCardsToBot = item.settings.notifyAllCardsToBot === true

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

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{t.botDigestBoard.enable}</span>
        <Switch
          checked={notifyAllCardsToBot}
          onCheckedChange={(checked) =>
            updateSettings.mutate({ itemId: item.id, settings: { ...item.settings, notifyAllCardsToBot: checked } })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{t.qplazeSync.enableForBoard}</span>
        <Switch
          checked={qplazeSyncEnabled}
          onCheckedChange={(checked) =>
            updateSettings.mutate({ itemId: item.id, settings: { ...item.settings, qplazeSyncEnabled: checked } })
          }
        />
      </div>

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

        {qplazeSyncEnabled && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={triggerQplazeSync.isPending}
            onClick={() => triggerQplazeSync.mutate()}
          >
            <CloudDownload className="h-3.5 w-3.5" />
            {triggerQplazeSync.isPending ? t.qplazeSync.syncing : t.qplazeSync.syncButton}
          </Button>
        )}

        <Button
          variant={selectMode ? 'default' : 'outline'}
          size="icon"
          className="h-8 w-8"
          aria-label={t.kanban.selectMode}
          title={t.kanban.selectMode}
          onClick={onToggleSelectMode}
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </Button>

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
