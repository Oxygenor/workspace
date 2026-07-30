import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { KanbanColumnRow, LabelRow, PriorityLevel } from '@/types/database'
import type { KanbanCardSummary } from './types'

export async function fetchColumns(boardId: string): Promise<KanbanColumnRow[]> {
  const result = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('board_id', boardId)
    .is('archived_at', null)
    .order('position', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити колонки.')
}

export async function fetchBoardLabels(boardId: string): Promise<LabelRow[]> {
  const result = await supabase.from('labels').select('*').eq('board_id', boardId).order('created_at', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити мітки.')
}

export async function fetchKanbanCards(boardId: string): Promise<KanbanCardSummary[]> {
  const cardsResult = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('board_id', boardId)
    .is('archived_at', null)
    .order('position', { ascending: true })
  const cards = throwIfError(cardsResult, 'Не вдалося завантажити картки.')

  if (cards.length === 0) return []

  const cardIds = cards.map((c) => c.id)

  const [cardLabelsRes, tagLinksRes, checklistRes, commentsRes, attachmentsRes] = await Promise.all([
    supabase.from('card_labels').select('card_id, label_id').in('card_id', cardIds),
    supabase.from('tag_links').select('card_id, tag_id').in('card_id', cardIds),
    supabase.from('checklist_items').select('card_id, completed').in('card_id', cardIds),
    supabase.from('comments').select('id, card_id').in('card_id', cardIds),
    supabase.from('attachments').select('id, card_id').in('card_id', cardIds),
  ])

  const cardLabels = throwIfError(cardLabelsRes, 'Не вдалося завантажити мітки карток.')
  const tagLinks = throwIfError(tagLinksRes, 'Не вдалося завантажити теги карток.')
  const checklist = throwIfError(checklistRes, 'Не вдалося завантажити чекліст.')
  const comments = throwIfError(commentsRes, 'Не вдалося завантажити коментарі.')
  const attachments = throwIfError(attachmentsRes, 'Не вдалося завантажити вкладення.')

  const labelsByCard = new Map<string, string[]>()
  for (const row of cardLabels) {
    const list = labelsByCard.get(row.card_id) ?? []
    list.push(row.label_id)
    labelsByCard.set(row.card_id, list)
  }

  const tagsByCard = new Map<string, string[]>()
  for (const row of tagLinks) {
    if (!row.card_id) continue
    const list = tagsByCard.get(row.card_id) ?? []
    list.push(row.tag_id)
    tagsByCard.set(row.card_id, list)
  }

  const checklistByCard = new Map<string, { total: number; completed: number }>()
  for (const row of checklist) {
    const stat = checklistByCard.get(row.card_id) ?? { total: 0, completed: 0 }
    stat.total += 1
    if (row.completed) stat.completed += 1
    checklistByCard.set(row.card_id, stat)
  }

  const commentsByCard = new Map<string, number>()
  for (const row of comments) {
    commentsByCard.set(row.card_id, (commentsByCard.get(row.card_id) ?? 0) + 1)
  }

  const attachmentsByCard = new Map<string, number>()
  for (const row of attachments) {
    if (!row.card_id) continue
    attachmentsByCard.set(row.card_id, (attachmentsByCard.get(row.card_id) ?? 0) + 1)
  }

  return cards.map((card) => ({
    ...card,
    labelIds: labelsByCard.get(card.id) ?? [],
    tagIds: tagsByCard.get(card.id) ?? [],
    checklistTotal: checklistByCard.get(card.id)?.total ?? 0,
    checklistCompleted: checklistByCard.get(card.id)?.completed ?? 0,
    commentsCount: commentsByCard.get(card.id) ?? 0,
    attachmentsCount: attachmentsByCard.get(card.id) ?? 0,
  }))
}

export async function createColumn(boardId: string, name: string, position: number): Promise<KanbanColumnRow> {
  const result = await supabase
    .from('kanban_columns')
    .insert({ board_id: boardId, name, position })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося створити колонку.')
}

export async function renameColumn(columnId: string, name: string): Promise<KanbanColumnRow> {
  const result = await supabase.from('kanban_columns').update({ name }).eq('id', columnId).select('*').single()
  return throwIfError(result, 'Не вдалося перейменувати колонку.')
}

export async function updateColumnColor(columnId: string, color: string): Promise<KanbanColumnRow> {
  const result = await supabase.from('kanban_columns').update({ color }).eq('id', columnId).select('*').single()
  return throwIfError(result, 'Не вдалося змінити колір колонки.')
}

export async function updateColumnWipLimit(columnId: string, wipLimit: number | null): Promise<KanbanColumnRow> {
  const result = await supabase
    .from('kanban_columns')
    .update({ wip_limit: wipLimit })
    .eq('id', columnId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося оновити ліміт колонки.')
}

export async function reorderColumn(columnId: string, position: number): Promise<void> {
  const { error } = await supabase.from('kanban_columns').update({ position }).eq('id', columnId)
  if (error) throw toAppError(error, 'Не вдалося змінити порядок колонок.')
}

export async function archiveColumn(columnId: string): Promise<void> {
  const { error } = await supabase
    .from('kanban_columns')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', columnId)
  if (error) throw toAppError(error, 'Не вдалося архівувати колонку.')
}

export async function restoreColumn(columnId: string): Promise<void> {
  const { error } = await supabase.from('kanban_columns').update({ archived_at: null }).eq('id', columnId)
  if (error) throw toAppError(error, 'Не вдалося відновити колонку.')
}

export async function deleteColumn(columnId: string): Promise<void> {
  const { error } = await supabase.from('kanban_columns').delete().eq('id', columnId)
  if (error) throw toAppError(error, 'Не вдалося видалити колонку.')
}

interface CreateCardInput {
  boardId: string
  columnId: string
  title: string
  position: number
  createdBy: string
}

export async function createCard(input: CreateCardInput) {
  const result = await supabase
    .from('kanban_cards')
    .insert({
      board_id: input.boardId,
      column_id: input.columnId,
      title: input.title,
      position: input.position,
      created_by: input.createdBy,
    })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося створити картку.')
}

export async function reorderCard(cardId: string, position: number): Promise<void> {
  const { error } = await supabase.from('kanban_cards').update({ position }).eq('id', cardId)
  if (error) throw toAppError(error, 'Не вдалося змінити порядок карток.')
}

export async function moveCard(cardId: string, newColumnId: string, newPosition: number): Promise<void> {
  const { error } = await supabase.rpc('move_kanban_card', {
    p_card_id: cardId,
    p_new_column_id: newColumnId,
    p_new_position: newPosition,
  })
  if (error) throw toAppError(error, 'Не вдалося перемістити картку.')
}

export async function archiveCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('kanban_cards')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', cardId)
  if (error) throw toAppError(error, 'Не вдалося архівувати картку.')
}

export async function restoreCard(cardId: string): Promise<void> {
  const { error } = await supabase.from('kanban_cards').update({ archived_at: null }).eq('id', cardId)
  if (error) throw toAppError(error, 'Не вдалося відновити картку.')
}

export async function deleteCard(cardId: string): Promise<void> {
  const { error } = await supabase.from('kanban_cards').delete().eq('id', cardId)
  if (error) throw toAppError(error, 'Не вдалося видалити картку.')
}

export async function createLabel(boardId: string, name: string, color: string): Promise<LabelRow> {
  const result = await supabase.from('labels').insert({ board_id: boardId, name, color }).select('*').single()
  return throwIfError(result, 'Не вдалося створити мітку.')
}

export async function deleteLabel(labelId: string): Promise<void> {
  const { error } = await supabase.from('labels').delete().eq('id', labelId)
  if (error) throw toAppError(error, 'Не вдалося видалити мітку.')
}

export type { PriorityLevel }
