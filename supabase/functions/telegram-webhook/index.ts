// Supabase Edge Function: telegram-webhook
//
// Receives Telegram's webhook POST for the Workspace daily-digest bot.
// Handles:
//   - `/start <code>` — the one-time account-linking handshake (user
//     generates a short-lived code in the app, see
//     src/features/integrations/api.ts, then sends it to their own bot).
//   - `/today` — sends the digest on demand (same content as the scheduled
//     telegram-digest run, via the shared `_shared/digest.ts` builder).
//   - `/pause <minutes>` — silences idle-nudge for N minutes (default 60)
//     without touching the idle_nudge_enabled toggle.
//   - anything else (no leading `/`) — quick-capture: stored as an
//     `inbox_items` row for later triage in the app's Inbox page.
//
// Deploy with `--no-verify-jwt` (see supabase/functions/README.md) since
// Telegram cannot send a Supabase auth JWT.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { sendTelegramMessage } from '../_shared/telegram.ts'
import { buildDigestForUser, formatDigestMessage } from '../_shared/digest.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface TelegramUpdate {
  message?: {
    text?: string
    chat?: { id: number }
    from?: { id: number; username?: string }
  }
}

const START_COMMAND_RE = /^\/start\s+(\S+)$/
const PAUSE_COMMAND_RE = /^\/pause(?:\s+(\d+))?$/
const DEFAULT_PAUSE_MINUTES = 60

function jsonOk(body: Record<string, unknown> = { ok: true }): Response {
  // Telegram expects a fast 2xx no matter what happened on our end,
  // otherwise it will keep retrying the same update.
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleStart(chatId: number, code: string): Promise<void> {
  const { data: linkCode } = await supabase
    .from('telegram_link_codes')
    .select('code, user_id, expires_at')
    .eq('code', code)
    .maybeSingle()

  const isExpired = !linkCode || new Date(linkCode.expires_at).getTime() < Date.now()

  if (isExpired) {
    await sendTelegramMessage(
      String(chatId),
      '❌ Код недійсний або застарів. Згенеруйте новий код у налаштуваннях Workspace та спробуйте ще раз.',
    )
    return
  }

  const { error: upsertError } = await supabase
    .from('user_integrations')
    .upsert({ user_id: linkCode.user_id, telegram_chat_id: String(chatId) }, { onConflict: 'user_id' })

  if (upsertError) {
    console.error('Failed to upsert user_integrations', upsertError)
    await sendTelegramMessage(String(chatId), '❌ Сталася помилка під час підключення. Спробуйте ще раз пізніше.')
    return
  }

  await supabase.from('telegram_link_codes').delete().eq('code', code)
  await sendTelegramMessage(String(chatId), '✅ Telegram підключено! Тепер ви отримуватимете щоденний дайджест.')
}

async function resolveUserId(chatId: number): Promise<string | null> {
  const { data } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('telegram_chat_id', String(chatId))
    .maybeSingle()
  return (data?.user_id as string | undefined) ?? null
}

async function handleToday(chatId: number, userId: string): Promise<void> {
  const { overdue, today } = await buildDigestForUser(supabase, userId)
  const message = formatDigestMessage(overdue, today, 'ondemand')
  await sendTelegramMessage(String(chatId), message ?? '🎉 Нічого прострочено чи на сьогодні немає.')
}

async function handlePause(chatId: number, userId: string, minutesRaw: string | undefined): Promise<void> {
  const minutes = minutesRaw ? Number.parseInt(minutesRaw, 10) : DEFAULT_PAUSE_MINUTES
  const pausedUntil = new Date(Date.now() + minutes * 60 * 1000)

  const { error } = await supabase
    .from('user_schedule_settings')
    .update({ idle_nudge_paused_until: pausedUntil.toISOString() })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to pause idle-nudge', error)
    await sendTelegramMessage(String(chatId), '❌ Не вдалося поставити на паузу. Спробуйте ще раз.')
    return
  }

  await sendTelegramMessage(String(chatId), `⏸️ Нагадування про простій вимкнено на ${minutes} хв.`)
}

async function handleCapture(chatId: number, userId: string, text: string): Promise<void> {
  const { error } = await supabase.from('inbox_items').insert({ user_id: userId, text })
  if (error) {
    console.error('Failed to capture inbox item', error)
    await sendTelegramMessage(String(chatId), '❌ Не вдалося зберегти запис.')
    return
  }
  await sendTelegramMessage(String(chatId), '✅ Додано у Вхідні.')
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return jsonOk()
  }

  const chatId = update.message?.chat?.id
  const text = update.message?.text

  if (!chatId || !text) {
    return jsonOk()
  }

  try {
    const startMatch = text.match(START_COMMAND_RE)
    if (startMatch) {
      await handleStart(chatId, startMatch[1])
      return jsonOk()
    }

    // Every other command/capture requires an already-linked chat.
    const userId = await resolveUserId(chatId)
    if (!userId) {
      if (text.startsWith('/')) return jsonOk()
      await sendTelegramMessage(
        String(chatId),
        'Спершу підключіть акаунт: згенеруйте код у налаштуваннях Workspace та надішліть /start <код>.',
      )
      return jsonOk()
    }

    if (text === '/today') {
      await handleToday(chatId, userId)
      return jsonOk()
    }

    const pauseMatch = text.match(PAUSE_COMMAND_RE)
    if (pauseMatch) {
      await handlePause(chatId, userId, pauseMatch[1])
      return jsonOk()
    }

    if (text.startsWith('/')) {
      // Unknown command — ack silently rather than guessing intent.
      return jsonOk()
    }

    await handleCapture(chatId, userId, text)
    return jsonOk()
  } catch (error) {
    console.error('telegram-webhook error', error)
    return jsonOk()
  }
})
