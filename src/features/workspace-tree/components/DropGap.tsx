import { useDroppable } from '@dnd-kit/core'

import { cn } from '@/lib/utils'
import type { WorkspaceItemRow } from '@/types/database'

interface DropGapProps {
  parentId: string | null
  before: WorkspaceItemRow | null
  after: WorkspaceItemRow | null
  depth: number
}

export function DropGap({ parentId, before, after, depth }: DropGapProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `gap:${parentId ?? 'root'}:${before?.id ?? 'start'}:${after?.id ?? 'end'}`,
    data: { kind: 'gap' as const, parentId, beforeId: before?.id ?? null, afterId: after?.id ?? null },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ paddingLeft: depth * 8 }}
      className="relative flex h-3 items-center"
    >
      <div className={cn('mx-2 h-0.5 flex-1 rounded-full transition-colors', isOver && 'bg-primary')} />
    </div>
  )
}
