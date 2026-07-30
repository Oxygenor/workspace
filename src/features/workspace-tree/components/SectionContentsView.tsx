import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, LayoutGrid, Plus, SquareChartGantt } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import type { WorkspaceItemRow } from '@/types/database'
import { CreateItemMenu } from './CreateItemMenu'
import { useCreateItem } from '../hooks'
import { nextAppendPosition } from '../tree-utils'
import { useCreateFromSectionTemplate } from '@/features/templates/hooks'
import { useUiStore } from '@/stores/ui-store'
import { TimelineView } from '@/features/timeline/components/TimelineView'
import { useTimelineEntries } from '@/features/timeline/hooks'

interface SectionContentsViewProps {
  section: WorkspaceItemRow
  items: WorkspaceItemRow[]
}

type ViewMode = 'grid' | 'timeline'

export function SectionContentsView({ section, items }: SectionContentsViewProps) {
  const navigate = useNavigate()
  const createItem = useCreateItem()
  const createFromTemplate = useCreateFromSectionTemplate()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const { data: timelineEntries } = useTimelineEntries(items)
  const hasTimeline = timelineEntries.length > 0

  function handleCreate(type: Parameters<typeof createItem.mutate>[0]['type']) {
    createItem.mutate(
      { type, name: t.tree.untitledSection, parentId: section.id, position: nextAppendPosition(items) },
      {
        onSuccess: (created) => {
          setPendingRenameItemId(created.id)
          navigate(`/app/item/${created.id}`)
        },
      },
    )
  }

  function handleCreateFromTemplate(template: Parameters<typeof createFromTemplate.mutate>[0]['template']) {
    createFromTemplate.mutate({ template, parentId: section.id, position: nextAppendPosition(items) })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FolderOpen className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted-foreground">{t.tree.emptyChildren}</p>
        <CreateItemMenu onSelect={handleCreate} onSelectTemplate={handleCreateFromTemplate}>
          <Button size="sm">
            <Plus />
            {t.common.create}
          </Button>
        </CreateItemMenu>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {hasTimeline && (
        <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            type="button"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
            {t.timeline.viewGrid}
          </Button>
          <Button
            type="button"
            variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode('timeline')}
          >
            <SquareChartGantt className="h-4 w-4" />
            {t.timeline.viewTimeline}
          </Button>
        </div>
      )}

      {hasTimeline && viewMode === 'timeline' ? (
        <TimelineView entries={timelineEntries} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = resolveIcon(item.icon, item.type)
            return (
              <Card
                key={item.id}
                className="flex cursor-pointer flex-row items-center gap-3 p-4 transition-shadow hover:shadow-md"
                onClick={() => navigate(`/app/item/${item.id}`)}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${item.color}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color: item.color }} />
                </span>
                <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
