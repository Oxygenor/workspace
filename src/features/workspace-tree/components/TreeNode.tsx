import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { ChevronRight, MoreHorizontal, Plus, Star } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import { useUiStore } from '@/stores/ui-store'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { useSaveSectionAsTemplate } from '@/features/templates/hooks'
import { SaveTemplateDialog } from '@/features/templates/components/SaveTemplateDialog'
import type { WorkspaceItemRow } from '@/types/database'
import { nextAppendPosition } from '../tree-utils'
import { useTreeData } from '../tree-context'
import {
  useArchiveItem,
  useCreateItem,
  useDeleteItem,
  useDuplicateItem,
  useRenameItem,
  useUpdateItemColor,
  useUpdateItemIcon,
} from '../hooks'
import { CreateItemMenu } from './CreateItemMenu'
import { IconPicker } from './IconPicker'
import { TreeLevel } from './TreeLevel'

interface TreeNodeProps {
  item: WorkspaceItemRow
  depth: number
}

export function TreeNode({ item, depth }: TreeNodeProps) {
  const navigate = useNavigate()
  const { itemId: activeItemId } = useParams<{ itemId: string }>()
  const { childrenMap } = useTreeData()

  const expanded = useUiStore((s) => s.expandedItemIds[item.id] ?? false)
  const toggleExpanded = useUiStore((s) => s.toggleExpanded)
  const pendingRenameItemId = useUiStore((s) => s.pendingRenameItemId)
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)

  const { data: favorites } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const createItem = useCreateItem()
  const renameItem = useRenameItem()
  const updateIcon = useUpdateItemIcon()
  const updateColor = useUpdateItemColor()
  const duplicateItem = useDuplicateItem()
  const archiveItem = useArchiveItem()
  const deleteItem = useDeleteItem()
  const saveAsTemplate = useSaveSectionAsTemplate()

  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(item.name)
  const [confirmOpen, setConfirmOpen] = useState<'archive' | 'delete' | null>(null)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSection = item.type === 'section'
  const children = childrenMap.get(item.id) ?? []
  const isActive = activeItemId === item.id
  const isFavorite = favorites?.some((f) => f.item_id === item.id) ?? false
  const Icon = resolveIcon(item.icon, item.type)

  useEffect(() => {
    if (pendingRenameItemId === item.id) {
      setIsEditing(true)
      setDraftName(item.name)
      setPendingRenameItemId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRenameItemId, item.id])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `item:${item.id}`,
    data: { kind: 'item' as const, item },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `nest:${item.id}`,
    data: { kind: 'nest' as const, parentId: item.id },
    disabled: !isSection,
  })

  function commitRename() {
    const trimmed = draftName.trim()
    setIsEditing(false)
    if (!trimmed) {
      setDraftName(item.name)
      return
    }
    if (trimmed !== item.name) {
      renameItem.mutate({ itemId: item.id, name: trimmed })
    }
  }

  function handleCreateChild(type: Parameters<typeof createItem.mutate>[0]['type']) {
    if (!expanded) toggleExpanded(item.id)
    createItem.mutate(
      { type, name: t.tree.untitledSection, parentId: item.id, position: nextAppendPosition(children) },
      {
        onSuccess: (created) => setPendingRenameItemId(created.id),
      },
    )
  }

  return (
    <div>
      <div
        ref={(node) => {
          setDragRef(node)
          setDropRef(node)
        }}
        {...attributes}
        {...listeners}
        style={{
          paddingLeft: depth * 8,
          backgroundColor: isActive ? undefined : `${item.color}14`,
        }}
        className={cn(
          'group flex h-8 cursor-grab items-center gap-1 rounded-md pr-1 text-sm transition-colors active:cursor-grabbing',
          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
          isOver && 'ring-1 ring-inset ring-primary',
          isDragging && 'opacity-40',
        )}
      >
        <button
          type="button"
          className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded', !isSection && 'invisible')}
          onClick={() => toggleExpanded(item.id)}
          aria-label={expanded ? 'Згорнути' : 'Розгорнути'}
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
            style={{ color: item.color }}
          />
        </button>

        <IconPicker
          value={item.icon ?? ''}
          onChange={(icon) => updateIcon.mutate({ itemId: item.id, icon })}
          color={item.color}
          onColorChange={(color) => updateColor.mutate({ itemId: item.id, color })}
        >
          <button type="button" className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Icon className="h-4 w-4" style={{ color: item.color }} />
          </button>
        </IconPicker>

        {isEditing ? (
          <Input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraftName(item.name)
                setIsEditing(false)
              }
            }}
            className="h-6 min-w-0 flex-1 px-1 py-0 text-sm"
          />
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left"
            onClick={() => navigate(`/app/item/${item.id}`)}
            onDoubleClick={() => setIsEditing(true)}
          >
            {item.name}
          </button>
        )}

        <div
          className={cn(
            'flex shrink-0 items-center gap-0.5 pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100',
            (createMenuOpen || actionsMenuOpen) && 'pointer-events-auto opacity-100',
          )}
        >
          {isSection && (
            <CreateItemMenu onSelect={handleCreateChild} onOpenChange={setCreateMenuOpen}>
              <Button variant="ghost" size="icon" className="h-6 w-6" title={t.create.title}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </CreateItemMenu>
          )}

          <DropdownMenu open={actionsMenuOpen} onOpenChange={setActionsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setIsEditing(true)}>{t.common.rename}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toggleFavorite.mutate(item.id)}>
                {isFavorite ? t.common.removeFromFavorites : t.common.addToFavorites}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => duplicateItem.mutate({ item, position: nextAppendPosition(childrenMap.get(item.parent_id) ?? []) })}
              >
                {t.common.duplicate}
              </DropdownMenuItem>
              {isSection && (
                <DropdownMenuItem onSelect={() => setSaveTemplateOpen(true)}>{t.templates.saveAsTemplate}</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmOpen('archive')}>{t.common.archive}</DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setConfirmOpen('delete')}
                className="text-destructive focus:text-destructive"
              >
                {t.common.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isFavorite && <Star className="h-3 w-3 shrink-0 fill-primary text-primary" />}
      </div>

      {isSection && expanded && <TreeLevel parentId={item.id} depth={depth + 1} />}

      <ConfirmDialog
        open={confirmOpen === 'archive'}
        onOpenChange={(open) => setConfirmOpen(open ? 'archive' : null)}
        title={t.tree.confirmArchiveTitle}
        description={t.tree.confirmArchiveDescription}
        confirmLabel={t.common.archive}
        destructive={false}
        onConfirm={() => archiveItem.mutate(item.id)}
      />
      <ConfirmDialog
        open={confirmOpen === 'delete'}
        onOpenChange={(open) => setConfirmOpen(open ? 'delete' : null)}
        title={t.tree.confirmDeleteTitle}
        description={t.tree.confirmDeleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteItem.mutate(item.id)}
      />
      {isSection && (
        <SaveTemplateDialog
          open={saveTemplateOpen}
          onOpenChange={setSaveTemplateOpen}
          title={t.templates.saveSectionTitle}
          defaultName={item.name}
          isSaving={saveAsTemplate.isPending}
          onSave={(name) => {
            saveAsTemplate.mutate(
              { name, rootItem: item },
              { onSuccess: () => setSaveTemplateOpen(false) },
            )
          }}
        />
      )}
    </div>
  )
}
