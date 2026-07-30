import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { toast } from 'sonner'

import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import type { WorkspaceItemRow } from '@/types/database'
import { useWorkspaceItems, useMoveItem } from '../hooks'
import { buildChildrenMap, buildItemMap, computeGapPosition, validateMoveTarget } from '../tree-utils'
import { TreeDataProvider } from '../tree-context'
import { TreeLevel } from './TreeLevel'

export function WorkspaceTree() {
  const { data: items, isLoading } = useWorkspaceItems()
  const moveItem = useMoveItem()
  const [activeItem, setActiveItem] = useState<WorkspaceItemRow | null>(null)

  const treeData = useMemo(() => {
    const list = items ?? []
    return { itemMap: buildItemMap(list), childrenMap: buildChildrenMap(list) }
  }, [items])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 2000, tolerance: 5 } }))

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { kind: 'item'; item: WorkspaceItemRow } | undefined
    setActiveItem(data?.item ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as { kind: 'item'; item: WorkspaceItemRow } | undefined
    if (!activeData) return
    const draggedItem = activeData.item

    const overData = over.data.current as
      | { kind: 'gap'; parentId: string | null; beforeId: string | null; afterId: string | null }
      | { kind: 'nest'; parentId: string }
      | undefined
    if (!overData) return

    let newParentId: string | null
    let newPosition: number

    if (overData.kind === 'nest') {
      newParentId = overData.parentId
      const siblings = treeData.childrenMap.get(newParentId) ?? []
      const lastSibling = siblings[siblings.length - 1]
      newPosition = lastSibling ? lastSibling.position + 1000 : 1000
    } else {
      newParentId = overData.parentId
      const before = overData.beforeId ? treeData.itemMap.get(overData.beforeId) : null
      const after = overData.afterId ? treeData.itemMap.get(overData.afterId) : null
      newPosition = computeGapPosition(before?.position ?? null, after?.position ?? null)
    }

    const validation = validateMoveTarget(treeData.itemMap, draggedItem.id, newParentId)
    if (!validation.valid) {
      const messages = {
        self: t.tree.invalidDropSelf,
        'not-section': t.tree.invalidDropNotSection,
        descendant: t.tree.invalidDropDescendant,
      } as const
      toast.error(messages[validation.reason])
      return
    }

    if (newParentId === draggedItem.parent_id && newPosition === draggedItem.position) {
      return
    }

    moveItem.mutate({ itemId: draggedItem.id, newParentId, newPosition })
  }

  if (isLoading) {
    return (
      <div className="space-y-1.5 px-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (!items || items.length === 0) {
    return <p className="px-3 py-2 text-sm text-muted-foreground">{t.tree.emptyRoot}</p>
  }

  const ActiveIcon = activeItem ? resolveIcon(activeItem.icon, activeItem.type) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <TreeDataProvider value={treeData}>
        <TreeLevel parentId={null} depth={0} />
      </TreeDataProvider>
      <DragOverlay>
        {activeItem && ActiveIcon ? (
          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2 text-sm shadow-md">
            <ActiveIcon className="h-4 w-4 text-muted-foreground" />
            {activeItem.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
