import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import {
  useChecklistItems,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useUpdateChecklistItem,
} from '../hooks'

interface ChecklistSectionProps {
  cardId: string
  boardId: string
}

export function ChecklistSection({ cardId, boardId }: ChecklistSectionProps) {
  const { data: items, isLoading } = useChecklistItems(cardId)
  const createItem = useCreateChecklistItem(cardId, boardId)
  const updateItem = useUpdateChecklistItem(cardId, boardId)
  const deleteItem = useDeleteChecklistItem(cardId, boardId)
  const [draft, setDraft] = useState('')

  const total = items?.length ?? 0
  const completed = items?.filter((i) => i.completed).length ?? 0
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  function handleAdd() {
    const trimmed = draft.trim()
    if (!trimmed) return
    const position = (items?.[items.length - 1]?.position ?? 0) + 1000
    createItem.mutate({ title: trimmed, position })
    setDraft('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t.card.checklist}</h3>
        {total > 0 && <span className="text-xs text-muted-foreground">{percent}%</span>}
      </div>

      {total > 0 && <Progress value={percent} className="h-1.5" />}

      {isLoading && <Skeleton className="h-16 w-full" />}

      {!isLoading && total === 0 && <p className="text-sm text-muted-foreground">{t.card.noChecklist}</p>}

      <div className="space-y-1">
        {items?.map((item) => (
          <div key={item.id} className="group flex items-center gap-2">
            <Checkbox
              checked={item.completed}
              onCheckedChange={(checked) => updateItem.mutate({ itemId: item.id, input: { completed: checked === true } })}
            />
            <span className={item.completed ? 'flex-1 text-sm text-muted-foreground line-through' : 'flex-1 text-sm'}>
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => deleteItem.mutate(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.card.addChecklistItem}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Button variant="outline" size="icon" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
