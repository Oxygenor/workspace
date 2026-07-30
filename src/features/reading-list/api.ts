import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { ReadingListItemRow } from '@/types/database'

export async function fetchReadingListItems(listId: string): Promise<ReadingListItemRow[]> {
  const result = await supabase
    .from('reading_list_items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити список читання.')
}

export async function createReadingListItem(
  listId: string,
  url: string,
  position: number,
): Promise<ReadingListItemRow> {
  const result = await supabase
    .from('reading_list_items')
    .insert({ list_id: listId, url, title: null, position })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося додати посилання.')
}

export interface UpdateReadingListItemInput {
  title?: string | null
  favicon_url?: string | null
  is_read?: boolean
  position?: number
}

export async function updateReadingListItem(
  itemId: string,
  input: UpdateReadingListItemInput,
): Promise<ReadingListItemRow> {
  const result = await supabase.from('reading_list_items').update(input).eq('id', itemId).select('*').single()
  return throwIfError(result, 'Не вдалося оновити посилання.')
}

export async function deleteReadingListItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('reading_list_items').delete().eq('id', itemId)
  if (error) throw toAppError(error, 'Не вдалося видалити посилання.')
}

export interface LinkMetadata {
  title: string | null
  faviconUrl: string | null
}

/**
 * Calls the `fetch-link-metadata` edge function via `functions.invoke` (not a
 * raw `fetch`) so the caller's Supabase session JWT is attached automatically
 * — that function is deployed with normal JWT verification, unlike the
 * Telegram/ICS functions which are invoked by third parties and use
 * `--no-verify-jwt`. The function itself always resolves with HTTP 200 and a
 * best-effort `{ title, faviconUrl }` payload (nulls on failure), so this
 * only throws on transport-level failures (network, auth).
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const { data, error } = await supabase.functions.invoke<LinkMetadata>('fetch-link-metadata', {
    body: { url },
  })
  if (error) throw toAppError(error, 'Не вдалося отримати метадані посилання.')
  return data ?? { title: null, faviconUrl: null }
}
