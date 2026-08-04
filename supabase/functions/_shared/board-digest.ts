// "/board" digest: unlike `_shared/digest.ts` (overdue + due-today only),
// this sends every active card — including ones with no due date — but
// only from boards the user has explicitly opted in via the board's
// "notifyAllCardsToBot" setting (see BoardHeader.tsx), so it doesn't dump
// every kanban board in the workspace on every request.

export interface BoardDigestCard {
  title: string
  due_date: string | null
  priority: string
}

export interface BoardDigestColumn {
  name: string
  cards: BoardDigestCard[]
}

export interface BoardDigestBoard {
  name: string
  columns: BoardDigestColumn[]
}

/**
 * `supabase` is a service-role client — this bypasses RLS, so every query
 * here is scoped to `userId`'s own workspaces/boards manually.
 */
export async function buildBoardDigestForUser(
  // eslint-disable-line @typescript-eslint/no-explicit-any -- matches the rest of this codebase's edge functions, which use an un-generic'd Supabase client
  supabase: any,
  userId: string,
): Promise<BoardDigestBoard[]> {
  const { data: memberships } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', userId)
  const workspaceIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)
  if (workspaceIds.length === 0) return []

  const { data: boards } = await supabase
    .from('workspace_items')
    .select('id, name, settings')
    .in('workspace_id', workspaceIds)
    .eq('type', 'kanban')
    .is('archived_at', null)

  const flaggedBoards = (boards ?? []).filter(
    (b: { settings: Record<string, unknown> }) => b.settings?.notifyAllCardsToBot === true,
  )
  if (flaggedBoards.length === 0) return []

  const result: BoardDigestBoard[] = []

  for (const board of flaggedBoards) {
    const { data: columns } = await supabase
      .from('kanban_columns')
      .select('id, name, is_done_column')
      .eq('board_id', board.id)
      .is('archived_at', null)
      .order('position', { ascending: true })

    const activeColumns = (columns ?? []).filter((c: { is_done_column: boolean }) => !c.is_done_column)
    if (activeColumns.length === 0) continue

    const columnIds = activeColumns.map((c: { id: string }) => c.id)
    const { data: cards } = await supabase
      .from('kanban_cards')
      .select('title, due_date, priority, column_id')
      .in('column_id', columnIds)
      .is('archived_at', null)
      .order('position', { ascending: true })

    const cardsByColumn = new Map<string, BoardDigestCard[]>()
    for (const card of cards ?? []) {
      const list = cardsByColumn.get(card.column_id as string) ?? []
      list.push({ title: card.title as string, due_date: card.due_date as string | null, priority: card.priority as string })
      cardsByColumn.set(card.column_id as string, list)
    }

    const boardColumns: BoardDigestColumn[] = activeColumns
      .map((c: { id: string; name: string }) => ({ name: c.name, cards: cardsByColumn.get(c.id) ?? [] }))
      .filter((c: BoardDigestColumn) => c.cards.length > 0)

    if (boardColumns.length > 0) {
      result.push({ name: board.name, columns: boardColumns })
    }
  }

  return result
}

const PRIORITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '⚪',
}

// Stay comfortably under Telegram's 4096-char single-message cap.
const TELEGRAM_MESSAGE_LIMIT = 3500

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Returns one or more message bodies (split so none exceeds Telegram's
 * length limit). Empty array means there's nothing to send — caller should
 * show a "nothing to show" hint instead.
 */
export function formatBoardDigestMessages(boards: BoardDigestBoard[]): string[] {
  if (boards.length === 0) return []

  const lines: string[] = []
  for (const board of boards) {
    lines.push(`📋 ${board.name}`)
    for (const column of board.columns) {
      lines.push(`  🔹 ${column.name}`)
      for (const card of column.cards) {
        const emoji = PRIORITY_EMOJI[card.priority] ?? '⚪'
        const due = card.due_date ? ` (до ${formatShortDate(card.due_date)})` : ''
        lines.push(`    ${emoji} ${card.title}${due}`)
      }
    }
    lines.push('')
  }

  // Greedy line-packing: never split a single line, but a board/column
  // header can end up alone at the tail of a chunk for very large boards —
  // an acceptable trade-off for this personal-scale tool.
  const messages: string[] = []
  let current: string[] = []
  let currentLength = 0
  for (const line of lines) {
    const lineLength = line.length + 1
    if (currentLength + lineLength > TELEGRAM_MESSAGE_LIMIT && current.length > 0) {
      messages.push(current.join('\n').trim())
      current = []
      currentLength = 0
    }
    current.push(line)
    currentLength += lineLength
  }
  if (current.length > 0) messages.push(current.join('\n').trim())

  return messages
}
