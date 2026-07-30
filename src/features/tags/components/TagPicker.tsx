import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { COLUMN_COLORS } from '@/lib/validations/kanban'
import { t } from '@/i18n'
import { useCreateTag, useTagIdsForTarget, useToggleTag, useWorkspaceTags } from '../hooks'

interface TagPickerProps {
  itemId?: string
  cardId?: string
  taskId?: string
}

export function TagPicker({ itemId, cardId, taskId }: TagPickerProps) {
  const target = { itemId, cardId, taskId }
  const { data: workspaceTags } = useWorkspaceTags()
  const { data: tagIds } = useTagIdsForTarget(target)
  const toggleTag = useToggleTag(target)
  const createTag = useCreateTag()
  const [newTagName, setNewTagName] = useState('')

  const assignedIds = new Set(tagIds ?? [])
  const assignedTags = (workspaceTags ?? []).filter((tag) => assignedIds.has(tag.id))

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignedTags.map((tag) => (
        <Badge key={tag.id} style={{ backgroundColor: tag.color, color: '#fff' }}>
          {tag.name}
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
            {(workspaceTags ?? []).length === 0 && (
              <p className="p-1.5 text-sm text-muted-foreground">{t.tags.noTags}</p>
            )}
            {(workspaceTags ?? []).map((tag) => {
              const isAssigned = assignedIds.has(tag.id)
              return (
                <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-accent">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={() => toggleTag.mutate({ tagId: tag.id, isAttached: isAssigned })}
                  />
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="truncate">{tag.name}</span>
                </label>
              )
            })}
          </div>
          <div className="flex gap-1 border-t border-border pt-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder={t.tags.newTagPlaceholder}
              className="h-8"
            />
            <Button
              size="sm"
              onClick={() => {
                const trimmed = newTagName.trim()
                if (!trimmed) return
                const color = COLUMN_COLORS[(workspaceTags?.length ?? 0) % COLUMN_COLORS.length]
                createTag.mutate(
                  { name: trimmed, color },
                  {
                    onSuccess: (created) => toggleTag.mutate({ tagId: created.id, isAttached: false }),
                  },
                )
                setNewTagName('')
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
