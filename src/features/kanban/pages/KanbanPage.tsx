import { useState } from 'react'

import type { ModuleComponentProps } from '@/lib/modules/registry'
import { CardDetailDialog } from '@/features/cards/components/CardDetailDialog'
import { BoardHeader } from '../components/BoardHeader'
import { KanbanBoard } from '../components/KanbanBoard'

export function KanbanPage({ item }: ModuleComponentProps) {
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4">
      <BoardHeader item={item} />
      <div className="min-h-0 flex-1">
        <KanbanBoard boardId={item.id} onOpenCard={setOpenCardId} />
      </div>

      {openCardId && (
        <CardDetailDialog
          cardId={openCardId}
          boardId={item.id}
          open={Boolean(openCardId)}
          onOpenChange={(open) => !open && setOpenCardId(null)}
        />
      )}
    </div>
  )
}
