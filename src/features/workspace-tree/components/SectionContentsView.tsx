import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import type { WorkspaceItemRow } from '@/types/database'
import { CreateItemMenu } from './CreateItemMenu'
import { useCreateItem } from '../hooks'
import { nextAppendPosition } from '../tree-utils'
import { useUiStore } from '@/stores/ui-store'

interface SectionContentsViewProps {
  section: WorkspaceItemRow
  items: WorkspaceItemRow[]
}

export function SectionContentsView({ section, items }: SectionContentsViewProps) {
  const navigate = useNavigate()
  const createItem = useCreateItem()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)

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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FolderOpen className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted-foreground">{t.tree.emptyChildren}</p>
        <CreateItemMenu onSelect={handleCreate}>
          <Button size="sm">
            <Plus />
            {t.common.create}
          </Button>
        </CreateItemMenu>
      </div>
    )
  }

  return (
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
  )
}
