// Shared "Мій день"-equivalent digest builder, used by both telegram-digest
// (scheduled morning/evening runs) and telegram-webhook (on-demand /today).

export interface DigestEntry {
  title: string
  due_date: string
}

function endOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Builds a user's digest (overdue + due-today tasks/cards, "done"-column
 * cards excluded even if not yet auto-archived). `supabase` is a
 * service-role client — this bypasses RLS, so callers must scope every
 * query to `userId`'s own workspaces themselves.
 */
export async function buildDigestForUser(
  // eslint-disable-line @typescript-eslint/no-explicit-any -- matches the rest of this codebase's edge functions, which use an un-generic'd Supabase client
  supabase: any,
  userId: string,
): Promise<{ overdue: DigestEntry[]; today: DigestEntry[] }> {
  const endToday = endOfToday()
  const startToday = startOfToday()

  const { data: memberships } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', userId)

  const workspaceIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)
  if (workspaceIds.length === 0) {
    return { overdue: [], today: [] }
  }

  const { data: items } = await supabase
    .from('workspace_items')
    .select('id, type')
    .in('workspace_id', workspaceIds)
    .in('type', ['task_list', 'kanban'])
    .is('archived_at', null)

  const taskListIds = (items ?? []).filter((i: { type: string }) => i.type === 'task_list').map((i: { id: string }) => i.id)
  const kanbanIds = (items ?? []).filter((i: { type: string }) => i.type === 'kanban').map((i: { id: string }) => i.id)

  const entries: DigestEntry[] = []

  if (taskListIds.length > 0) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, due_date')
      .in('task_list_id', taskListIds)
      .eq('completed', false)
      .not('due_date', 'is', null)
      .lte('due_date', endToday.toISOString())

    for (const task of tasks ?? []) {
      entries.push({ title: `📝 ${task.title}`, due_date: task.due_date as string })
    }
  }

  if (kanbanIds.length > 0) {
    const { data: doneColumns } = await supabase
      .from('kanban_columns')
      .select('id')
      .in('board_id', kanbanIds)
      .eq('is_done_column', true)
    const doneColumnIds = new Set((doneColumns ?? []).map((c: { id: string }) => c.id))

    const { data: cards } = await supabase
      .from('kanban_cards')
      .select('title, due_date, column_id')
      .in('board_id', kanbanIds)
      .is('archived_at', null)
      .not('due_date', 'is', null)
      .lte('due_date', endToday.toISOString())

    for (const card of cards ?? []) {
      // Card already sits in a "done" column — treat it as completed even
      // though it hasn't been auto-archived yet (that only happens after
      // the column's configured grace period).
      if (doneColumnIds.has(card.column_id as string)) continue
      entries.push({ title: `🗂️ ${card.title}`, due_date: card.due_date as string })
    }
  }

  const overdue = entries.filter((e) => new Date(e.due_date).getTime() < startToday.getTime())
  const today = entries.filter((e) => new Date(e.due_date).getTime() >= startToday.getTime())

  return {
    overdue: overdue.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    today: today.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
  }
}

export type DigestMode = 'morning' | 'evening' | 'ondemand'

const DIGEST_HEADERS: Record<DigestMode, string> = {
  morning: '☀️ План на сьогодні:',
  evening: '🌙 Не встигли виконати сьогодні:',
  ondemand: '📋 Ваш день:',
}

/** Returns `null` when there's nothing to report (caller should skip sending). */
export function formatDigestMessage(overdue: DigestEntry[], today: DigestEntry[], mode: DigestMode): string | null {
  if (overdue.length === 0 && today.length === 0) {
    return null
  }

  const lines: string[] = [DIGEST_HEADERS[mode]]

  if (overdue.length > 0) {
    lines.push('', '⏰ Прострочено:')
    for (const entry of overdue) lines.push(`• ${entry.title}`)
  }

  if (today.length > 0) {
    lines.push('')
    for (const entry of today) lines.push(`• ${entry.title}`)
  }

  return lines.join('\n')
}
