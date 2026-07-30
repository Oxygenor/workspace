import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBoardLabels, useCreateLabel } from '@/features/kanban/hooks'
import { COLUMN_COLORS } from '@/lib/validations/kanban'
import { t } from '@/i18n'
import { useCardLabelIds, useToggleCardLabel } from '../hooks'

interface LabelsPickerProps {
  cardId: string
  boardId: string
}

export function LabelsPicker({ cardId, boardId }: LabelsPickerProps) {
  const { data: boardLabels } = useBoardLabels(boardId)
  const { data: cardLabelIds } = useCardLabelIds(cardId)
  const toggleLabel = useToggleCardLabel(cardId, boardId)
  const createLabel = useCreateLabel(boardId)
  const [newLabelName, setNewLabelName] = useState('')

  const assignedIds = new Set(cardLabelIds ?? [])
  const assignedLabels = (boardLabels ?? []).filter((l) => assignedIds.has(l.id))

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignedLabels.map((label) => (
        <Badge key={label.id} style={{ backgroundColor: label.color, color: '#fff' }}>
          {label.name}
        </Badge>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2" align="start">
          <div className="space-y-1">
            {(boardLabels ?? []).map((label) => {
              const isAssigned = assignedIds.has(label.id)
              return (
                <label key={label.id} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-accent">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={() => toggleLabel.mutate({ labelId: label.id, isAssigned })}
                  />
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="truncate">{label.name}</span>
                </label>
              )
            })}
          </div>
          <div className="flex gap-1 border-t border-border pt-2">
            <Input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder={t.kanban.label}
              className="h-8"
            />
            <Button
              size="sm"
              onClick={() => {
                const trimmed = newLabelName.trim()
                if (!trimmed) return
                const color = COLUMN_COLORS[(boardLabels?.length ?? 0) % COLUMN_COLORS.length]
                createLabel.mutate({ name: trimmed, color })
                setNewLabelName('')
              }}
            >
              {t.common.create}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
