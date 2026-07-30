import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Merge, Tag as TagIcon, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import { useDeleteTag, useMergeTags, useTagLinkCounts, useTagWithLinkedEntities, useWorkspaceTags } from '../hooks'

export default function TagsPage() {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false)
  const [mergeSourceId, setMergeSourceId] = useState<string | undefined>(undefined)
  const [mergeTargetId, setMergeTargetId] = useState<string | undefined>(undefined)
  const navigate = useNavigate()

  const { data: tags, isLoading: tagsLoading } = useWorkspaceTags()
  const tagIds = (tags ?? []).map((tag) => tag.id)
  const { data: counts } = useTagLinkCounts(tagIds)
  const deleteTag = useDeleteTag()
  const mergeTags = useMergeTags()

  const canMerge = (tags?.length ?? 0) >= 2
  const mergeSourceOptions = (tags ?? []).filter((tag) => tag.id !== mergeTargetId)
  const mergeTargetOptions = (tags ?? []).filter((tag) => tag.id !== mergeSourceId)

  function resetMergeSelection() {
    setMergeSourceId(undefined)
    setMergeTargetId(undefined)
  }

  function handleMergeDialogChange(open: boolean) {
    setMergeDialogOpen(open)
    if (!open) resetMergeSelection()
  }

  function handleConfirmMerge() {
    if (!mergeSourceId || !mergeTargetId) return
    mergeTags.mutate(
      { sourceTagId: mergeSourceId, targetTagId: mergeTargetId },
      {
        onSuccess: () => {
          setMergeConfirmOpen(false)
          setMergeDialogOpen(false)
          resetMergeSelection()
        },
      },
    )
  }

  const {
    data: detail,
    isLoading: detailLoading,
  } = useTagWithLinkedEntities(selectedTagId ?? undefined)

  if (selectedTagId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTagId(null)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.tags.backToList}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTargetId(selectedTagId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {detailLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!detailLoading && detail && (
          <>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: detail.tag.color }} />
              <h1 className="text-xl font-semibold text-foreground">{detail.tag.name}</h1>
            </div>

            {detail.items.length === 0 && detail.cards.length === 0 && detail.tasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.tags.emptyLinked}</p>
            )}

            {detail.items.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.tags.sections}</h2>
                <div className="space-y-2">
                  {detail.items.map((item) => {
                    const Icon = resolveIcon(item.icon, item.type)
                    return (
                      <Card
                        key={item.id}
                        className="flex cursor-pointer flex-row items-center gap-3 p-3 transition-shadow hover:shadow-md"
                        onClick={() => navigate(`/app/item/${item.id}`)}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${item.color}22` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: item.color }} />
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {detail.cards.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.tags.cards}</h2>
                <div className="space-y-2">
                  {detail.cards.map((card) => (
                    <Card
                      key={card.id}
                      className="flex cursor-pointer flex-row items-center gap-3 p-3 transition-shadow hover:shadow-md"
                      onClick={() => navigate(`/app/item/${card.board_id}`)}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${card.boardColor}22` }}
                      >
                        <TagIcon className="h-4 w-4" style={{ color: card.boardColor }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{card.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{card.boardName}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {detail.tasks.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.tags.tasks}</h2>
                <div className="space-y-2">
                  {detail.tasks.map((task) => (
                    <Card
                      key={task.id}
                      className="flex cursor-pointer flex-row items-center gap-3 p-3 transition-shadow hover:shadow-md"
                      onClick={() => navigate(`/app/item/${task.task_list_id}`)}
                    >
                      <span className={task.completed ? 'truncate text-sm text-muted-foreground line-through' : 'truncate text-sm font-medium text-foreground'}>
                        {task.title}
                      </span>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <ConfirmDialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => !open && setDeleteTargetId(null)}
          title={t.tags.deleteTagTitle}
          description={t.tags.deleteTagDescription}
          onConfirm={() => {
            if (deleteTargetId) {
              deleteTag.mutate(deleteTargetId)
              setDeleteTargetId(null)
              setSelectedTagId(null)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">{t.tags.title}</h1>
        <span title={canMerge ? undefined : t.tagsMerge.needTwoTags}>
          <Button
            variant="outline"
            size="sm"
            disabled={!canMerge}
            onClick={() => setMergeDialogOpen(true)}
          >
            <Merge className="h-3.5 w-3.5" />
            {t.tagsMerge.action}
          </Button>
        </span>
      </div>

      {tagsLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!tagsLoading && (tags?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <TagIcon className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">{t.tags.noTagsInWorkspace}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tags?.map((tag) => (
          <Card
            key={tag.id}
            className="flex cursor-pointer flex-row items-center gap-3 p-4 transition-shadow hover:shadow-md"
            onClick={() => setSelectedTagId(tag.id)}
          >
            <Badge style={{ backgroundColor: tag.color, color: '#fff' }}>{tag.name}</Badge>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs text-muted-foreground">
              {counts?.[tag.id] ?? 0} {t.tags.itemsCount}
            </span>
          </Card>
        ))}
      </div>

      <Dialog open={mergeDialogOpen} onOpenChange={handleMergeDialogChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.tagsMerge.action}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t.tagsMerge.sourceLabel}</Label>
              <Select
                value={mergeSourceId}
                onValueChange={(value) => setMergeSourceId(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mergeSourceOptions.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.tagsMerge.targetLabel}</Label>
              <Select
                value={mergeTargetId}
                onValueChange={(value) => setMergeTargetId(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mergeTargetOptions.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
              onClick={() => setMergeConfirmOpen(true)}
            >
              {t.tagsMerge.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={mergeConfirmOpen}
        onOpenChange={setMergeConfirmOpen}
        title={t.tagsMerge.confirmTitle}
        description={t.tagsMerge.confirmDescription}
        confirmLabel={t.tagsMerge.action}
        onConfirm={handleConfirmMerge}
      />
    </div>
  )
}
