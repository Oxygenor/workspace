import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type { KanbanCardRow } from '@/types/database'

export interface AssignedCard extends KanbanCardRow {
  board_name: string | null
}

export async function fetchMyAssignedCards(userId: string): Promise<AssignedCard[]> {
  const assigneeResult = await supabase.from('card_assignees').select('card_id').eq('user_id', userId)
  const assignments = throwIfError(assigneeResult, 'Не вдалося завантажити призначені картки.')
  if (assignments.length === 0) return []

  const cardIds = assignments.map((a) => a.card_id)
  const cardsResult = await supabase
    .from('kanban_cards')
    .select('*')
    .in('id', cardIds)
    .is('archived_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })
  const cards = throwIfError(cardsResult, 'Не вдалося завантажити призначені картки.')

  if (cards.length === 0) return []

  const boardIds = [...new Set(cards.map((c) => c.board_id))]
  const boardsResult = await supabase.from('workspace_items').select('id, name').in('id', boardIds)
  const boards = throwIfError(boardsResult, 'Не вдалося завантажити назви дошок.')
  const boardNameById = new Map(boards.map((b) => [b.id, b.name]))

  return cards.map((card) => ({ ...card, board_name: boardNameById.get(card.board_id) ?? null }))
}

export async function fetchUpcomingCardDeadlines(withinDays = 7): Promise<KanbanCardRow[]> {
  const now = new Date()
  const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)
  const result = await supabase
    .from('kanban_cards')
    .select('*')
    .is('archived_at', null)
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', until.toISOString())
    .order('due_date', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити дедлайни.')
}

export async function fetchOverdueCards(): Promise<KanbanCardRow[]> {
  const result = await supabase
    .from('kanban_cards')
    .select('*')
    .is('archived_at', null)
    .not('due_date', 'is', null)
    .lt('due_date', new Date().toISOString())
    .order('due_date', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити прострочені картки.')
}
