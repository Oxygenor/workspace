import { useDroppable } from '@dnd-kit/core'

import { cn } from '@/lib/utils'

interface CardDropGapProps {
  columnId: string
  beforeId: string | null
  afterId: string | null
}

export function CardDropGap({ columnId, beforeId, afterId }: CardDropGapProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `card-gap:${columnId}:${beforeId ?? 'start'}:${afterId ?? 'end'}`,
    data: { kind: 'card-gap' as const, columnId, beforeId, afterId },
  })

  return (
    <div ref={setNodeRef} className="h-2">
      <div className={cn('mx-1 h-0.5 rounded-full transition-colors', isOver && 'bg-primary')} />
    </div>
  )
}
