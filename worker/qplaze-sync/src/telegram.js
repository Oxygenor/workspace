import { config } from './config.js'

// Mirrors supabase/functions/_shared/telegram.ts — same raw Telegram Bot API
// call, duplicated here (rather than shared) because this worker runs
// outside Supabase's Deno runtime entirely.
export async function sendTelegramMessage(chatId, text) {
  if (!config.telegramBotToken) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    return res.ok
  } catch (error) {
    console.error('qplaze-sync-worker: failed to send Telegram message', error instanceof Error ? error.message : '')
    return false
  }
}
