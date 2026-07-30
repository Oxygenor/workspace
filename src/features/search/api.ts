import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'

export interface CardSearchResult {
  id: string
  board_id: string
  title: string
  card_number: number
}

/** Strips characters with special meaning in a PostgREST filter string (`,()%*`) so user input can't alter the filter's structure. */
function sanitizeForOrFilter(query: string): string {
  return query.replace(/[,()%*]/g, ' ').trim()
}

export async function searchCards(boardIds: string[], query: string): Promise<CardSearchResult[]> {
  const safeQuery = sanitizeForOrFilter(query)
  if (boardIds.length === 0 || !safeQuery) return []

  const result = await supabase
    .from('kanban_cards')
    .select('id, board_id, title, card_number')
    .in('board_id', boardIds)
    .is('archived_at', null)
    .or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
    .limit(10)

  return throwIfError(result, 'Не вдалося виконати пошук карток.')
}
