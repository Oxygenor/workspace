import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type {
  AttachmentRow,
  CardAssigneeRow,
  ChecklistItemRow,
  CommentRow,
  KanbanCardRow,
  PriorityLevel,
  ProfileRow,
} from '@/types/database'

export async function fetchCard(cardId: string): Promise<KanbanCardRow> {
  const result = await supabase.from('kanban_cards').select('*').eq('id', cardId).single()
  return throwIfError(result, 'Не вдалося завантажити картку.')
}

export interface UpdateCardInput {
  title?: string
  description?: string | null
  priority?: PriorityLevel
  start_date?: string | null
  due_date?: string | null
  column_id?: string
}

export async function updateCard(cardId: string, input: UpdateCardInput): Promise<KanbanCardRow> {
  const result = await supabase.from('kanban_cards').update(input).eq('id', cardId).select('*').single()
  return throwIfError(result, 'Не вдалося оновити картку.')
}

export async function fetchCardAssignees(cardId: string): Promise<CardAssigneeRow[]> {
  const result = await supabase.from('card_assignees').select('*').eq('card_id', cardId)
  return throwIfError(result, 'Не вдалося завантажити виконавців.')
}

export async function addCardAssignee(cardId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('card_assignees').insert({ card_id: cardId, user_id: userId })
  if (error) throw toAppError(error, 'Не вдалося додати виконавця.')
}

export async function removeCardAssignee(cardId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('card_assignees').delete().eq('card_id', cardId).eq('user_id', userId)
  if (error) throw toAppError(error, 'Не вдалося прибрати виконавця.')
}

export async function fetchCardLabelIds(cardId: string): Promise<string[]> {
  const result = await supabase.from('card_labels').select('label_id').eq('card_id', cardId)
  const rows = throwIfError(result, 'Не вдалося завантажити мітки картки.')
  return rows.map((r) => r.label_id)
}

export async function addCardLabel(cardId: string, labelId: string): Promise<void> {
  const { error } = await supabase.from('card_labels').insert({ card_id: cardId, label_id: labelId })
  if (error) throw toAppError(error, 'Не вдалося додати мітку.')
}

export async function removeCardLabel(cardId: string, labelId: string): Promise<void> {
  const { error } = await supabase.from('card_labels').delete().eq('card_id', cardId).eq('label_id', labelId)
  if (error) throw toAppError(error, 'Не вдалося прибрати мітку.')
}

export async function fetchChecklistItems(cardId: string): Promise<ChecklistItemRow[]> {
  const result = await supabase
    .from('checklist_items')
    .select('*')
    .eq('card_id', cardId)
    .order('position', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити чекліст.')
}

export async function createChecklistItem(cardId: string, title: string, position: number): Promise<ChecklistItemRow> {
  const result = await supabase
    .from('checklist_items')
    .insert({ card_id: cardId, title, position })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося додати пункт чекліста.')
}

export async function updateChecklistItem(
  itemId: string,
  input: { title?: string; completed?: boolean; position?: number },
): Promise<ChecklistItemRow> {
  const result = await supabase.from('checklist_items').update(input).eq('id', itemId).select('*').single()
  return throwIfError(result, 'Не вдалося оновити пункт чекліста.')
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId)
  if (error) throw toAppError(error, 'Не вдалося видалити пункт чекліста.')
}

export interface CommentWithAuthor extends CommentRow {
  author: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

export async function fetchComments(cardId: string): Promise<CommentWithAuthor[]> {
  const result = await supabase.from('comments').select('*').eq('card_id', cardId).order('created_at', { ascending: true })
  const comments = throwIfError(result, 'Не вдалося завантажити коментарі.')
  if (comments.length === 0) return []

  const authorIds = [...new Set(comments.map((c) => c.author_id).filter((id): id is string => Boolean(id)))]
  if (authorIds.length === 0) return comments.map((c) => ({ ...c, author: null }))

  const profilesResult = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', authorIds)
  const profiles = throwIfError(profilesResult, 'Не вдалося завантажити авторів коментарів.')
  const profileById = new Map(profiles.map((p) => [p.id, p]))

  return comments.map((c) => ({ ...c, author: c.author_id ? profileById.get(c.author_id) ?? null : null }))
}

export async function createComment(cardId: string, authorId: string, content: string): Promise<CommentRow> {
  const result = await supabase
    .from('comments')
    .insert({ card_id: cardId, author_id: authorId, content })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося додати коментар.')
}

export async function updateComment(commentId: string, content: string): Promise<CommentRow> {
  const result = await supabase.from('comments').update({ content }).eq('id', commentId).select('*').single()
  return throwIfError(result, 'Не вдалося оновити коментар.')
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw toAppError(error, 'Не вдалося видалити коментар.')
}

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024

export async function fetchAttachments(cardId: string): Promise<AttachmentRow[]> {
  const result = await supabase.from('attachments').select('*').eq('card_id', cardId).order('created_at', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити вкладення.')
}

export async function uploadAttachment(
  workspaceId: string,
  cardId: string,
  uploadedBy: string,
  file: File,
): Promise<AttachmentRow> {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(`Файл завеликий. Максимальний розмір — ${MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)} МБ.`)
  }

  const path = `${workspaceId}/${cardId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
  if (uploadError) {
    throw toAppError(uploadError, 'Не вдалося завантажити файл.')
  }

  const result = await supabase
    .from('attachments')
    .insert({
      workspace_id: workspaceId,
      card_id: cardId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: uploadedBy,
    })
    .select('*')
    .single()

  return throwIfError(result, 'Файл завантажено, але не вдалося зберегти запис.')
}

export async function getAttachmentDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(storagePath, 60 * 5)
  if (error || !data) throw toAppError(error, 'Не вдалося отримати посилання на файл.')
  return data.signedUrl
}

export async function deleteAttachment(attachmentId: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from('attachments').remove([storagePath])
  if (storageError) throw toAppError(storageError, 'Не вдалося видалити файл зі сховища.')

  const { error } = await supabase.from('attachments').delete().eq('id', attachmentId)
  if (error) throw toAppError(error, 'Не вдалося видалити запис про вкладення.')
}
