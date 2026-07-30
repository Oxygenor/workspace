import { useState } from 'react'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/use-auth'
import { t } from '@/i18n'
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from '../hooks'

interface CommentsSectionProps {
  cardId: string
  boardId: string
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })
}

export function CommentsSection({ cardId, boardId }: CommentsSectionProps) {
  const { user } = useAuth()
  const { data: comments, isLoading } = useComments(cardId)
  const createComment = useCreateComment(cardId, boardId)
  const updateComment = useUpdateComment(cardId)
  const deleteComment = useDeleteComment(cardId, boardId)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  function handleSubmit() {
    const trimmed = draft.trim()
    if (!trimmed) return
    createComment.mutate(trimmed, { onSuccess: () => setDraft('') })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t.card.comments}</h3>

      {isLoading && <Skeleton className="h-16 w-full" />}
      {!isLoading && (comments?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">{t.card.noComments}</p>
      )}

      <div className="space-y-4">
        {comments?.map((comment) => {
          const isOwn = comment.author_id === user?.id
          const isEditing = editingId === comment.id
          return (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={comment.author?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {(comment.author?.full_name ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{comment.author?.full_name ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} className="min-h-16" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const trimmed = editDraft.trim()
                          if (trimmed) updateComment.mutate({ commentId: comment.id, content: trimmed })
                          setEditingId(null)
                        }}
                      >
                        {t.common.save}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        {t.common.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
                )}
              </div>
              {isOwn && !isEditing && (
                <div className="flex shrink-0 items-start gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setEditingId(comment.id)
                      setEditDraft(comment.content)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.card.addComment}
          className="min-h-16"
        />
        <Button size="sm" onClick={handleSubmit} disabled={createComment.isPending || !draft.trim()}>
          {createComment.isPending && <Loader2 className="animate-spin" />}
          {t.card.addComment}
        </Button>
      </div>
    </div>
  )
}
