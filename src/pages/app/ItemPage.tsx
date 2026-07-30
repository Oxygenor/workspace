import { Suspense, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MoreHorizontal, Star } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resolveIcon } from '@/lib/modules/icon-map'
import { moduleRegistry } from '@/lib/modules/registry'
import { t } from '@/i18n'
import { Breadcrumbs } from '@/features/workspace-tree/components/Breadcrumbs'
import { IconPicker } from '@/features/workspace-tree/components/IconPicker'
import { SectionContentsView } from '@/features/workspace-tree/components/SectionContentsView'
import { TagPicker } from '@/features/tags/components/TagPicker'
import { useSaveSectionAsTemplate } from '@/features/templates/hooks'
import { SaveTemplateDialog } from '@/features/templates/components/SaveTemplateDialog'
import {
  useArchiveItem,
  useDeleteItem,
  useDuplicateItem,
  useRenameItem,
  useUpdateItemColor,
  useUpdateItemIcon,
  useWorkspaceItems,
} from '@/features/workspace-tree/hooks'
import { nextAppendPosition } from '@/features/workspace-tree/tree-utils'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import NotFoundPage from '@/pages/NotFoundPage'

export default function ItemPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { data: items, isLoading } = useWorkspaceItems()
  const { data: favorites } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const renameItem = useRenameItem()
  const updateIcon = useUpdateItemIcon()
  const updateColor = useUpdateItemColor()
  const duplicateItem = useDuplicateItem()
  const archiveItem = useArchiveItem()
  const deleteItem = useDeleteItem()
  const saveAsTemplate = useSaveSectionAsTemplate()

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [confirmOpen, setConfirmOpen] = useState<'archive' | 'delete' | null>(null)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const item = items?.find((i) => i.id === itemId)
  if (!item) {
    return <NotFoundPage />
  }

  const Icon = resolveIcon(item.icon, item.type)
  const isFavorite = favorites?.some((f) => f.item_id === item.id) ?? false
  const children = (items ?? []).filter((i) => i.parent_id === item.id)

  function startEditing() {
    setDraftName(item!.name)
    setIsEditingTitle(true)
  }

  function commitRename() {
    const trimmed = draftName.trim()
    setIsEditingTitle(false)
    if (trimmed && trimmed !== item!.name) {
      renameItem.mutate({ itemId: item!.id, name: trimmed })
    }
  }

  const moduleDef = moduleRegistry[item.type]

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <Breadcrumbs itemId={item.id} />

      <div className="flex items-center gap-3">
        <IconPicker
          value={item.icon ?? ''}
          onChange={(icon) => updateIcon.mutate({ itemId: item.id, icon })}
          color={item.color}
          onColorChange={(color) => updateColor.mutate({ itemId: item.id, color })}
        >
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${item.color}22` }}
          >
            <Icon className="h-5 w-5" style={{ color: item.color }} />
          </button>
        </IconPicker>

        {isEditingTitle ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setIsEditingTitle(false)
            }}
            className="h-9 max-w-md text-lg font-semibold"
          />
        ) : (
          <h1
            className="cursor-text break-words text-xl font-semibold text-foreground"
            onClick={startEditing}
          >
            {item.name}
          </h1>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite.mutate(item.id)}
            title={isFavorite ? t.common.removeFromFavorites : t.common.addToFavorites}
          >
            <Star className={isFavorite ? 'h-4 w-4 fill-primary text-primary' : 'h-4 w-4'} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={startEditing}>{t.common.rename}</DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  duplicateItem.mutate(
                    { item, position: nextAppendPosition((items ?? []).filter((i) => i.parent_id === item.parent_id)) },
                    { onSuccess: (created) => navigate(`/app/item/${created.id}`) },
                  )
                }
              >
                {t.common.duplicate}
              </DropdownMenuItem>
              {item.type === 'section' && (
                <DropdownMenuItem onSelect={() => setSaveTemplateOpen(true)}>{t.templates.saveAsTemplate}</DropdownMenuItem>
              )}
              {item.type !== 'section' && (
                <DropdownMenuItem onSelect={() => navigate(`/app/split/${item.id}`)}>{t.splitView.open}</DropdownMenuItem>
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
      </div>

      <TagPicker itemId={item.id} />

      {item.type === 'section' ? (
        <SectionContentsView section={item} items={children} />
      ) : moduleDef ? (
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <moduleDef.component item={item} />
        </Suspense>
      ) : null}

      <ConfirmDialog
        open={confirmOpen === 'archive'}
        onOpenChange={(open) => setConfirmOpen(open ? 'archive' : null)}
        title={t.tree.confirmArchiveTitle}
        description={t.tree.confirmArchiveDescription}
        confirmLabel={t.common.archive}
        destructive={false}
        onConfirm={() => {
          archiveItem.mutate(item.id)
          navigate('/app/home')
        }}
      />
      <ConfirmDialog
        open={confirmOpen === 'delete'}
        onOpenChange={(open) => setConfirmOpen(open ? 'delete' : null)}
        title={t.tree.confirmDeleteTitle}
        description={t.tree.confirmDeleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          deleteItem.mutate(item.id)
          navigate('/app/home')
        }}
      />
      {item.type === 'section' && (
        <SaveTemplateDialog
          open={saveTemplateOpen}
          onOpenChange={setSaveTemplateOpen}
          title={t.templates.saveSectionTitle}
          defaultName={item.name}
          isSaving={saveAsTemplate.isPending}
          onSave={(name) => {
            saveAsTemplate.mutate({ name, rootItem: item }, { onSuccess: () => setSaveTemplateOpen(false) })
          }}
        />
      )}
    </div>
  )
}
