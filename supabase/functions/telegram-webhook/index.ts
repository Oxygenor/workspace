// Supabase Edge Function: telegram-webhook
//
// Receives Telegram's webhook POST for the Workspace daily-digest bot.
// Handles the account-linking handshake: the user generates a short-lived
// code in the app (see src/features/integrations/api.ts), then sends
// `/start <code>` to their own bot. We look the code up, attach the
// resulting `chat.id` to their `user_integrations` row, and confirm.
//
// Deploy with `--no-verify-jwt` (see supabase/functions/README.md) since
// Telegram cannot send a Supabase auth JWT.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface TelegramUpdate {
  message?: {
    text?: string
    chat?: { id: number }
    from?: { id: number; username?: string }
  }
}

const START_COMMAND_RE = /^\/start\s+(\S+)$/

async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set — cannot send Telegram message')
    return
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch (error) {
    console.error('Failed to send Telegram message', error)
  }
}

function jsonOk(body: Record<string, unknown> = { ok: true }): Response {
  // Telegram expects a fast 2xx no matter what happened on our end,
  // otherwise it will keep retrying the same update.
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

  const match = text.match(START_COMMAND_RE)
  if (!match) {
    // Not a /start <code> message — nothing to do, but still ack Telegram.
    return jsonOk()
  }

  const code = match[1]

  try {
    const { data: linkCode } = await supabase
      .from('telegram_link_codes')
      .select('code, user_id, expires_at')
      .eq('code', code)
      .maybeSingle()

    const isExpired = !linkCode || new Date(linkCode.expires_at).getTime() < Date.now()

    if (isExpired) {
      await sendTelegramMessage(
        chatId,
        '❌ Код недійсний або застарів. Згенеруйте новий код у налаштуваннях Workspace та спробуйте ще раз.',
      )
      return jsonOk()
    }

    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({ user_id: linkCode.user_id, telegram_chat_id: String(chatId) }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('Failed to upsert user_integrations', upsertError)
      await sendTelegramMessage(chatId, '❌ Сталася помилка під час підключення. Спробуйте ще раз пізніше.')
      return jsonOk()
    }

    await supabase.from('telegram_link_codes').delete().eq('code', code)

    await sendTelegramMessage(chatId, '✅ Telegram підключено! Тепер ви отримуватимете щоденний дайджест.')

    return jsonOk()
  } catch (error) {
    console.error('telegram-webhook error', error)
    return jsonOk()
  }
})
