import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { FavoriteRow } from '@/types/database'

export async function fetchFavorites(workspaceId: string): Promise<FavoriteRow[]> {
  const result = await supabase.from('favorites').select('*').eq('workspace_id', workspaceId)
  return throwIfError(result, 'Не вдалося завантажити обране.')
}

export async function addFavorite(workspaceId: string, userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('favorites').insert({ workspace_id: workspaceId, user_id: userId, item_id: itemId })
  if (error) throw toAppError(error, 'Не вдалося додати в обране.')
}

export async function removeFavorite(itemId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('item_id', itemId).eq('user_id', userId)
  if (error) throw toAppError(error, 'Не вдалося прибрати з обраного.')
}
