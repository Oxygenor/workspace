import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { DocumentRow, ItemType, WorkspaceItemRow } from '@/types/database'
import { extractMentionNames, resolveMentionItem } from './mentions'

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

export async function updateDocumentPinned(itemId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('documents').update({ pinned }).eq('item_id', itemId)
  if (error) throw toAppError(error, 'Не вдалося оновити закріплення нотатки.')
}

export interface UpdateDocumentLockInput {
  locked: boolean
  lock_pin_hash: string | null
}

export async function updateDocumentLock(itemId: string, input: UpdateDocumentLockInput): Promise<void> {
  const { error } = await supabase.from('documents').update(input).eq('item_id', itemId)
  if (error) throw toAppError(error, 'Не вдалося оновити захист нотатки.')
}

export interface PinnedNoteItem {
  id: string
  name: string
  type: ItemType
  icon: string | null
  color: string
}

/**
 * All pinned notes' workspace items, scoped to `workspaceId`. Follows the
 * same manual two-query join pattern as `fetchBacklinks` below (no FK embed)
 * since `documents` and `workspace_items` are queried separately here.
 */
export async function fetchPinnedNotes(workspaceId: string): Promise<PinnedNoteItem[]> {
  const docsResult = await supabase.from('documents').select('item_id').eq('pinned', true)
  const docs = throwIfError(docsResult, 'Не вдалося завантажити закріплені нотатки.') as { item_id: string }[]
  if (docs.length === 0) return []

  const itemIds = [...new Set(docs.map((d) => d.item_id))]
  const itemsResult = await supabase
    .from('workspace_items')
    .select('id, name, type, icon, color')
    .eq('workspace_id', workspaceId)
    .in('id', itemIds)
  return throwIfError(itemsResult, 'Не вдалося завантажити закріплені нотатки.')
}

export interface NoteBacklinkItem {
  id: string
  name: string
  type: ItemType
  icon: string | null
  color: string
}

/**
 * Parses `[[Name]]` mentions out of `content`, resolves each to a workspace
 * item id (skipping unresolved names and self-references), and syncs
 * `note_links` so it exactly reflects the current content: existing rows for
 * `sourceItemId` are deleted, then the resolved pairs are (re)inserted.
 */
export async function syncNoteLinks(
  sourceItemId: string,
  content: string,
  allItems: Pick<WorkspaceItemRow, 'id' | 'name'>[],
): Promise<void> {
  const mentionNames = extractMentionNames(content)
  const targetIds = new Set<string>()
  for (const name of mentionNames) {
    const match = resolveMentionItem(name, allItems)
    if (match && match.id !== sourceItemId) {
      targetIds.add(match.id)
    }
  }

  const { error: deleteError } = await supabase.from('note_links').delete().eq('source_item_id', sourceItemId)
  if (deleteError) throw toAppError(deleteError, 'Не вдалося оновити згадування нотатки.')

  if (targetIds.size === 0) return

  const rows = [...targetIds].map((targetItemId) => ({
    source_item_id: sourceItemId,
    target_item_id: targetItemId,
  }))
  const { error: insertError } = await supabase.from('note_links').insert(rows)
  if (insertError) throw toAppError(insertError, 'Не вдалося зберегти згадування нотатки.')
}

/** All workspace items whose note content mentions `itemId` (i.e. backlinks). */
export async function fetchBacklinks(itemId: string): Promise<NoteBacklinkItem[]> {
  const linksResult = await supabase.from('note_links').select('source_item_id').eq('target_item_id', itemId)
  const links = throwIfError(linksResult, 'Не вдалося завантажити згадування.') as { source_item_id: string }[]

  const sourceIds = [...new Set(links.map((link) => link.source_item_id))]
  if (sourceIds.length === 0) return []

  const itemsResult = await supabase.from('workspace_items').select('id, name, type, icon, color').in('id', sourceIds)
  return throwIfError(itemsResult, 'Не вдалося завантажити елементи, що згадують цю нотатку.')
}
