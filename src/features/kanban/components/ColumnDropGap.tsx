import { useDroppable } from '@dnd-kit/core'

import { cn } from '@/lib/utils'

interface ColumnDropGapProps {
  beforeId: string | null
  afterId: string | null
}

export function ColumnDropGap({ beforeId, afterId }: ColumnDropGapProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-gap:${beforeId ?? 'start'}:${afterId ?? 'end'}`,
    data: { kind: 'column-gap' as const, beforeId, afterId },
  })

  return (
    <div ref={setNodeRef} className="flex w-3 shrink-0 items-stretch self-stretch">
      <div className={cn('mx-auto w-0.5 rounded-full transition-colors', isOver && 'bg-primary')} />
    </div>
  )
}
