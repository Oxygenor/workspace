// Supabase Edge Function: telegram-digest
//
// Meant to run once a day via pg_cron + pg_net (see supabase/functions/README.md).
// For every user who has linked Telegram, sends a "Мій день"-equivalent
// digest: tasks and kanban cards that are overdue or due today.
//
// This runs with the service-role client, which bypasses RLS entirely —
// so unlike the browser's `fetchMyDay()` (src/features/home/api.ts), which
// relies on RLS to scope results to the caller's workspaces, we must
// manually resolve each user's workspace membership before querying tasks
// and cards, or we'd leak every workspace's data to every user's digest.
//
// Design choice: if a user has nothing overdue or due today, we skip
// sending them a message entirely (rather than sending an empty "nothing
// planned today" notification) to avoid daily notification spam for an
// otherwise-idle account. Both `sent` and `skipped` counts are returned so
// this is observable when triggered manually or inspected via cron logs.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface DigestEntry {
  title: string
  due_date: string
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set — cannot send Telegram message')
    return false
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    return res.ok
  } catch (error) {
    console.error('Failed to send Telegram message', error)
    return false
  }
}

function endOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

async function buildDigestForUser(userId: string): Promise<{ overdue: DigestEntry[]; today: DigestEntry[] }> {
  const endToday = endOfToday()
  const startToday = startOfToday()

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)
  if (workspaceIds.length === 0) {
    return { overdue: [], today: [] }
  }

  const { data: items } = await supabase
    .from('workspace_items')
    .select('id, type')
    .in('workspace_id', workspaceIds)
    .in('type', ['task_list', 'kanban'])
    .is('archived_at', null)

  const taskListIds = (items ?? []).filter((i) => i.type === 'task_list').map((i) => i.id)
  const kanbanIds = (items ?? []).filter((i) => i.type === 'kanban').map((i) => i.id)

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
    const { data: cards } = await supabase
      .from('kanban_cards')
      .select('title, due_date')
      .in('board_id', kanbanIds)
      .is('archived_at', null)
      .not('due_date', 'is', null)
      .lte('due_date', endToday.toISOString())

    for (const card of cards ?? []) {
      entries.push({ title: `🗂️ ${card.title}`, due_date: card.due_date as string })
    }
  }

  const overdue = entries.filter((e) => new Date(e.due_date).getTime() < startToday.getTime())
  const today = entries.filter((e) => new Date(e.due_date).getTime() >= startToday.getTime())

  return { overdue, today }
}

/** Returns `null` when there's nothing to report (caller should skip sending). */
function formatDigestMessage(overdue: DigestEntry[], today: DigestEntry[]): string | null {
  if (overdue.length === 0 && today.length === 0) {
    return null
  }

  const lines: string[] = ['☀️ Ваш день:']

  if (overdue.length > 0) {
    lines.push('', '⏰ Прострочено:')
    for (const entry of overdue) lines.push(`• ${entry.title}`)
  }

  if (today.length > 0) {
    lines.push('', '📅 Сьогодні:')
    for (const entry of today) lines.push(`• ${entry.title}`)
  }

  return lines.join('\n')
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { data: integrations, error } = await supabase
      .from('user_integrations')
      .select('user_id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)

    if (error) throw error

    let sent = 0
    let skipped = 0

    for (const integration of integrations ?? []) {
      const chatId = integration.telegram_chat_id as string | null
      if (!chatId) {
        skipped += 1
        continue
      }

      const { overdue, today } = await buildDigestForUser(integration.user_id as string)
      const message = formatDigestMessage(overdue, today)

      if (!message) {
        skipped += 1
        continue
      }

      const ok = await sendTelegramMessage(chatId, message)
      if (ok) sent += 1
      else skipped += 1
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('telegram-digest error', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
