// Supabase Edge Function: weekly-summary
//
// Meant to run once a week via pg_cron + pg_net (see supabase/functions/README.md).
// For every user who has linked Telegram, sends a review of the last 7 days:
// hours tracked, cards closed (is_done_column, same signal as the fixed
// "Закрито цього тижня" report), and the longest-untouched open card (a
// nudge to deal with whatever's been sitting the longest). Always sends
// regardless of day-off status — this is a weekly review, not a work-hours
// nudge.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { sendTelegramMessage } from '../_shared/telegram.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SINCE_DAYS = 7

function formatHours(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes} хв`
  return `${hours} год ${minutes} хв`
}

async function buildSummaryForUser(userId: string): Promise<string | null> {
  const since = new Date(Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: entries } = await supabase
    .from('time_entries')
    .select('started_at, ended_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', since)

  const totalSeconds = (entries ?? []).reduce(
    (sum: number, e: { started_at: string; ended_at: string }) =>
      sum + (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 1000,
    0,
  )

  const { data: memberships } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', userId)
  const workspaceIds = (memberships ?? []).map((m: { workspace_id: string }) => m.workspace_id)

  let closedTitles: string[] = []
  let oldestOpenCard: { title: string; days: number } | null = null

  if (workspaceIds.length > 0) {
    const { data: boards } = await supabase
      .from('workspace_items')
      .select('id')
      .eq('type', 'kanban')
      .in('workspace_id', workspaceIds)
      .is('archived_at', null)
    const boardIds = (boards ?? []).map((b: { id: string }) => b.id)

    if (boardIds.length > 0) {
      const { data: doneColumns } = await supabase
        .from('kanban_columns')
        .select('id')
        .in('board_id', boardIds)
        .eq('is_done_column', true)
      const doneColumnIds = (doneColumns ?? []).map((c: { id: string }) => c.id)

      if (doneColumnIds.length > 0) {
        const { data: closedCards } = await supabase
          .from('kanban_cards')
          .select('title')
          .in('column_id', doneColumnIds)
          .is('archived_at', null)
          .gte('column_entered_at', since)
        closedTitles = (closedCards ?? []).map((c: { title: string }) => c.title)
      }

      let openCardsQuery = supabase
        .from('kanban_cards')
        .select('title, column_entered_at')
        .in('board_id', boardIds)
        .is('archived_at', null)
        .order('column_entered_at', { ascending: true })
        .limit(1)
      if (doneColumnIds.length > 0) {
        openCardsQuery = openCardsQuery.not('column_id', 'in', `(${doneColumnIds.join(',')})`)
      }
      const { data: openCards } = await openCardsQuery
      const oldest = (openCards ?? [])[0] as { title: string; column_entered_at: string } | undefined
      if (oldest) {
        const days = Math.floor((Date.now() - new Date(oldest.column_entered_at).getTime()) / (24 * 60 * 60 * 1000))
        oldestOpenCard = { title: oldest.title, days }
      }
    }
  }

  if (totalSeconds === 0 && closedTitles.length === 0 && !oldestOpenCard) {
    return null
  }

  const lines = ['📊 Тижневий підсумок:', '', `⏱ Часу відстежено: ${formatHours(totalSeconds)}`]

  lines.push(`✅ Закрито карток: ${closedTitles.length}`)
  for (const title of closedTitles.slice(0, 5)) lines.push(`  • ${title}`)

  if (oldestOpenCard && oldestOpenCard.days >= 1) {
    lines.push('', `🐢 Найдовше без руху: «${oldestOpenCard.title}» (${oldestOpenCard.days} дн.)`)
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
      const userId = integration.user_id as string
      if (!chatId) {
        skipped += 1
        continue
      }

      const message = await buildSummaryForUser(userId)
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
    console.error('weekly-summary error', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
