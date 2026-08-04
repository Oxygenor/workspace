import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Archive, CheckCircle2, GripVertical, LayoutTemplate, MoreHorizontal, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import { COLUMN_COLORS } from '@/lib/validations/kanban'
import { nextAppendPosition } from '@/lib/position'
import { useCreateFromCardTemplate, useTemplates } from '@/features/templates/hooks'
import type { KanbanColumnRow } from '@/types/database'
import type { KanbanCardSummary } from '../types'
import {
  useArchiveColumn,
  useCreateCard,
  useDeleteColumn,
  useRenameColumn,
  useUpdateColumnAutoArchive,
  useUpdateColumnColor,
  useUpdateColumnWipLimit,
} from '../hooks'
import { CardDropGap } from './CardDropGap'
import { KanbanCardPreview } from './KanbanCardPreview'

interface KanbanColumnProps {
  column: KanbanColumnRow
  cards: KanbanCardSummary[]
  boardId: string
  onOpenCard: (cardId: string) => void
  selectMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (cardId: string) => void
}

export function KanbanColumn({
  column,
  cards,
  boardId,
  onOpenCard,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: KanbanColumnProps) {
  const renameColumn = useRenameColumn(boardId)
  const updateColor = useUpdateColumnColor(boardId)
  const updateWipLimit = useUpdateColumnWipLimit(boardId)
  const updateAutoArchive = useUpdateColumnAutoArchive(boardId)
  const archiveColumn = useArchiveColumn(boardId)
  const deleteColumn = useDeleteColumn(boardId)
  const createCard = useCreateCard(boardId)
  const { data: cardTemplates } = useTemplates('card')
  const createFromCardTemplate = useCreateFromCardTemplate(boardId)

  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(column.name)
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [draftWipLimit, setDraftWipLimit] = useState(column.wip_limit ? String(column.wip_limit) : '')
  const [draftArchiveDays, setDraftArchiveDays] = useState(String(column.auto_archive_days))

  const wipLimitExceeded = column.wip_limit != null && cards.length > column.wip_limit

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `column:${column.id}`,
    data: { kind: 'column' as const, column },
  })

  function commitRename() {
    const trimmed = draftName.trim()
    setIsEditingName(false)
    if (trimmed && trimmed !== column.name) {
      renameColumn.mutate({ columnId: column.id, name: trimmed })
    } else {
      setDraftName(column.name)
    }
  }

  function commitWipLimit() {
    const trimmed = draftWipLimit.trim()
    const parsed = trimmed ? Number.parseInt(trimmed, 10) : 0
    const nextLimit = !parsed || parsed <= 0 ? null : parsed
    if (nextLimit !== column.wip_limit) {
      updateWipLimit.mutate({ columnId: column.id, wipLimit: nextLimit })
    }
    setDraftWipLimit(nextLimit ? String(nextLimit) : '')
  }

  function commitArchiveDays() {
    const trimmed = draftArchiveDays.trim()
    const parsed = trimmed ? Number.parseInt(trimmed, 10) : 7
    const days = !parsed || parsed <= 0 ? 7 : parsed
    if (days !== column.auto_archive_days) {
      updateAutoArchive.mutate({ columnId: column.id, isDoneColumn: column.is_done_column, autoArchiveDays: days })
    }
    setDraftArchiveDays(String(days))
  }

  function handleAddCard() {
    const trimmed = newCardTitle.trim()
    if (!trimmed) {
      setIsAddingCard(false)
      return
    }
    createCard.mutate({ columnId: column.id, title: trimmed, position: nextAppendPosition(cards) })
    setNewCardTitle('')
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        borderTopColor: column.color,
      }}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-xl border border-t-4 border-border bg-muted/40',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-1 p-2">
        <button {...attributes} {...listeners} className="flex h-6 w-5 cursor-grab items-center justify-center text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
        {column.is_done_column && (
          <span
            className="shrink-0"
            title={`${t.autoArchive.badgeTooltipPrefix} ${column.auto_archive_days} ${t.autoArchive.badgeTooltipSuffix}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </span>
        )}

        {isEditingName ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraftName(column.name)
                setIsEditingName(false)
              }
            }}
            className="h-7 flex-1"
          />
        ) : (
          <button className="flex-1 truncate text-left text-sm font-semibold" onClick={() => setIsEditingName(true)}>
            {column.name}
          </button>
        )}

        <span
          className={cn(
            'shrink-0 rounded-full bg-background px-1.5 py-0.5 text-xs text-muted-foreground',
            wipLimitExceeded && 'bg-destructive/15 font-semibold text-destructive',
          )}
          title={wipLimitExceeded ? t.wipLimit.exceeded : undefined}
        >
          {column.wip_limit != null ? `${cards.length}/${column.wip_limit}` : cards.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditingName(true)}>{t.common.rename}</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t.kanban.columnColor}</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="flex w-auto gap-1 p-2">
                  {COLUMN_COLORS.map((color) => (
                    <button
                      key={color}
                      className="h-6 w-6 rounded-full ring-offset-2 hover:ring-2 hover:ring-ring"
                      style={{ backgroundColor: color }}
                      onClick={() => updateColor.mutate({ columnId: column.id, color })}
                    />
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub onOpenChange={(open) => !open && commitWipLimit()}>
              <DropdownMenuSubTrigger>{t.wipLimit.label}</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-40 p-2">
                  <Input
                    autoFocus
                    type="number"
                    min={0}
                    value={draftWipLimit}
                    onChange={(e) => setDraftWipLimit(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && commitWipLimit()}
                    placeholder={t.wipLimit.placeholder}
                    className="h-8"
                  />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub onOpenChange={(open) => !open && commitArchiveDays()}>
              <DropdownMenuSubTrigger>{t.autoArchive.settingsTitle}</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56 space-y-2 p-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-sm">{t.autoArchive.enable}</span>
                    <Switch
                      checked={column.is_done_column}
                      onCheckedChange={(checked) =>
                        updateAutoArchive.mutate({
                          columnId: column.id,
                          isDoneColumn: checked,
                          autoArchiveDays: column.auto_archive_days,
                        })
                      }
                    />
                  </div>
                  {column.is_done_column && (
                    <div className="space-y-1 px-1">
                      <span className="text-xs text-muted-foreground">{t.autoArchive.daysLabel}</span>
                      <Input
                        type="number"
                        min={1}
                        value={draftArchiveDays}
                        onChange={(e) => setDraftArchiveDays(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && commitArchiveDays()}
                        className="h-8"
                      />
                    </div>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => archiveColumn.mutate(column.id)}>
              <Archive />
              {t.kanban.archiveColumn}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteConfirmOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 />
              {t.kanban.deleteColumn}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {cards.length === 0 ? (
          <CardDropGap columnId={column.id} beforeId={null} afterId={null} />
        ) : (
          <>
            <CardDropGap columnId={column.id} beforeId={null} afterId={cards[0].id} />
            {cards.map((card, index) => (
              <div key={card.id} className="space-y-2">
                <KanbanCardPreview
                  card={card}
                  boardId={boardId}
                  onOpen={() => onOpenCard(card.id)}
                  selectMode={selectMode}
                  selected={selectedIds?.has(card.id) ?? false}
                  onToggleSelect={onToggleSelect}
                />
                <CardDropGap columnId={column.id} beforeId={card.id} afterId={cards[index + 1]?.id ?? null} />
              </div>
            ))}
          </>
        )}

        {cards.length === 0 && (
          <p className="py-2 text-center text-xs text-muted-foreground">{t.kanban.emptyColumn}</p>
        )}
      </div>

      <div className="p-2 pt-0">
        {isAddingCard ? (
          <div className="space-y-1">
            <Input
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder={t.kanban.cardTitlePlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard()
                if (e.key === 'Escape') {
                  setIsAddingCard(false)
                  setNewCardTitle('')
                }
              }}
              onBlur={handleAddCard}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={() => setIsAddingCard(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t.kanban.addCard}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={t.templates.createFromTemplate}>
                  <LayoutTemplate className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(cardTemplates?.length ?? 0) === 0 && (
                  <DropdownMenuItem disabled>{t.templates.noCardTemplates}</DropdownMenuItem>
                )}
                {cardTemplates?.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onSelect={() =>
                      createFromCardTemplate.mutate({
                        template,
                        columnId: column.id,
                        position: nextAppendPosition(cards),
                      })
                    }
                  >
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.tree.confirmDeleteTitle}
        description={t.tree.confirmDeleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteColumn.mutate(column.id)}
      />
    </div>
  )
}
