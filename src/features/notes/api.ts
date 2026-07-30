import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { DocumentRow } from '@/types/database'

export async function fetchDocument(itemId: string): Promise<DocumentRow> {
  const result = await supabase.from('documents').select('*').eq('item_id', itemId).single()
  return throwIfError(result, 'Не вдалося завантажити нотатку.')
}

export async function updateDocument(itemId: string, content: string, updatedBy: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ content, updated_by: updatedBy })
    .eq('item_id', itemId)
  if (error) throw toAppError(error, 'Не вдалося зберегти нотатку.')
}
