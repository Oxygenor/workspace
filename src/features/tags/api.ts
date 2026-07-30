import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { ItemType, TagLinkRow, TagRow } from '@/types/database'

export interface TagTarget {
  itemId?: string
  cardId?: string
  taskId?: string
}

export interface WorkspaceItemLite {
  id: string
  name: string
  type: ItemType
  icon: string | null
  color: string
}

export interface CardLite {
  id: string
  title: string
  board_id: string
  card_number: number
  boardName: string
  boardIcon: string | null
  boardColor: string
}

export interface TaskLite {
  id: string
  title: string
  task_list_id: string
  completed: boolean
}

export interface TagWithLinkedEntities {
  tag: TagRow
  items: WorkspaceItemLite[]
  cards: CardLite[]
  tasks: TaskLite[]
}

export async function fetchWorkspaceTags(workspaceId: string): Promise<TagRow[]> {
  const result = await supabase.from('tags').select('*').eq('workspace_id', workspaceId).order('name', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити теги.')
}

export async function createTag(workspaceId: string, name: string, color: string): Promise<TagRow> {
  const result = await supabase.from('tags').insert({ workspace_id: workspaceId, name, color }).select('*').single()
  return throwIfError(result, 'Не вдалося створити тег.')
}

export async function deleteTag(tagId: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) throw toAppError(error, 'Не вдалося видалити тег.')
}

export async function mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
  const linksResult = await supabase.from('tag_links').select('*').eq('tag_id', sourceTagId)
  const links = throwIfError(linksResult, 'Не вдалося завантажити зв’язки тегу.') as TagLinkRow[]

  for (const link of links) {
    const row = {
      tag_id: targetTagId,
      item_id: link.item_id,
      card_id: link.card_id,
      task_id: link.task_id,
    }
    const onConflict = link.item_id ? 'tag_id,item_id' : link.card_id ? 'tag_id,card_id' : 'tag_id,task_id'

    // ignoreDuplicates -> INSERT ... ON CONFLICT DO NOTHING: no-ops if the target tag is
    // already linked to the same item/card/task, without requiring UPDATE privileges
    // (tag_links only has insert/select/delete RLS policies, no update policy).
    const { error } = await supabase.from('tag_links').upsert(row, { onConflict, ignoreDuplicates: true })
    if (error) throw toAppError(error, 'Не вдалося об’єднати теги.')
  }

  const { error: deleteError } = await supabase.from('tags').delete().eq('id', sourceTagId)
  if (deleteError) throw toAppError(deleteError, 'Не вдалося об’єднати теги.')
}

export async function fetchTagLinkCounts(tagIds: string[]): Promise<Record<string, number>> {
  if (tagIds.length === 0) return {}
  const result = await supabase.from('tag_links').select('tag_id').in('tag_id', tagIds)
  const rows = throwIfError(result, 'Не вдалося завантажити кількість позначень.') as { tag_id: string }[]

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.tag_id] = (counts[row.tag_id] ?? 0) + 1
  }
  return counts
}

export async function fetchTagIdsForTarget({ itemId, cardId, taskId }: TagTarget): Promise<string[]> {
  let query = supabase.from('tag_links').select('tag_id')
  if (itemId) query = query.eq('item_id', itemId)
  else if (cardId) query = query.eq('card_id', cardId)
  else if (taskId) query = query.eq('task_id', taskId)

  const result = await query
  const rows = throwIfError(result, 'Не вдалося завантажити теги.')
  return rows.map((row: { tag_id: string }) => row.tag_id)
}

export async function attachTag({ tagId, itemId, cardId, taskId }: TagTarget & { tagId: string }): Promise<void> {
  const { error } = await supabase.from('tag_links').insert({
    tag_id: tagId,
    item_id: itemId ?? null,
    card_id: cardId ?? null,
    task_id: taskId ?? null,
  })
  if (error) throw toAppError(error, 'Не вдалося прикріпити тег.')
}

export async function detachTag({ tagId, itemId, cardId, taskId }: TagTarget & { tagId: string }): Promise<void> {
  let query = supabase.from('tag_links').delete().eq('tag_id', tagId)
  if (itemId) query = query.eq('item_id', itemId)
  else if (cardId) query = query.eq('card_id', cardId)
  else if (taskId) query = query.eq('task_id', taskId)

  const { error } = await query
  if (error) throw toAppError(error, 'Не вдалося відкріпити тег.')
}

export async function fetchTagWithLinkedEntities(tagId: string): Promise<TagWithLinkedEntities> {
  const tagResult = await supabase.from('tags').select('*').eq('id', tagId).single()
  const tag = throwIfError(tagResult, 'Не вдалося завантажити тег.')

  const linksResult = await supabase.from('tag_links').select('*').eq('tag_id', tagId)
  const links = throwIfError(linksResult, 'Не вдалося завантажити зв’язки тегу.') as {
    item_id: string | null
    card_id: string | null
    task_id: string | null
  }[]

  const itemIds = links.map((l) => l.item_id).filter((id): id is string => Boolean(id))
  const cardIds = links.map((l) => l.card_id).filter((id): id is string => Boolean(id))
  const taskIds = links.map((l) => l.task_id).filter((id): id is string => Boolean(id))

  const [itemsRes, cardsRes, tasksRes] = await Promise.all([
    itemIds.length > 0
      ? supabase.from('workspace_items').select('id, name, type, icon, color').in('id', itemIds)
      : Promise.resolve({ data: [] as WorkspaceItemLite[], error: null }),
    cardIds.length > 0
      ? supabase.from('kanban_cards').select('id, title, board_id, card_number').in('id', cardIds)
      : Promise.resolve({ data: [] as Pick<CardLite, 'id' | 'title' | 'board_id' | 'card_number'>[], error: null }),
    taskIds.length > 0
      ? supabase.from('tasks').select('id, title, task_list_id, completed').in('id', taskIds)
      : Promise.resolve({ data: [] as TaskLite[], error: null }),
  ])

  const items = throwIfError(itemsRes, 'Не вдалося завантажити розділи.')
  const cardsRaw = throwIfError(cardsRes, 'Не вдалося завантажити картки.') as Pick<
    CardLite,
    'id' | 'title' | 'board_id' | 'card_number'
  >[]
  const tasks = throwIfError(tasksRes, 'Не вдалося завантажити завдання.')

  let cards: CardLite[] = []
  if (cardsRaw.length > 0) {
    const boardIds = [...new Set(cardsRaw.map((c) => c.board_id))]
    const boardsResult = await supabase.from('workspace_items').select('id, name, icon, color').in('id', boardIds)
    const boards = throwIfError(boardsResult, 'Не вдалося завантажити дошки.') as {
      id: string
      name: string
      icon: string | null
      color: string
    }[]
    const boardsById = new Map(boards.map((b) => [b.id, b]))

    cards = cardsRaw.map((c) => {
      const board = boardsById.get(c.board_id)
      return {
        id: c.id,
        title: c.title,
        board_id: c.board_id,
        card_number: c.card_number,
        boardName: board?.name ?? '',
        boardIcon: board?.icon ?? null,
        boardColor: board?.color ?? '#a855f7',
      }
    })
  }

  return { tag, items, cards, tasks }
}
