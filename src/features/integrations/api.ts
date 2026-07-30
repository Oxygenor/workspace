import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type { UserIntegrationRow } from '@/types/database'

/** The `user_integrations` row is auto-created for every user by a DB trigger, so it always exists. */
export async function fetchUserIntegrations(userId: string): Promise<UserIntegrationRow> {
  const result = await supabase.from('user_integrations').select('*').eq('user_id', userId).single()
  return throwIfError(result, 'Не вдалося завантажити налаштування інтеграцій.')
}

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CODE_LENGTH = 6

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')
}

/**
 * Generates a short-lived linking code and stores it server-side (RLS lets a
 * user insert only their own row). The code doesn't need to be
 * cryptographically unguessable: it's single-use, expires in 15 minutes
 * (see `telegram_link_codes.expires_at` default), and only usable by
 * whoever sends it to the Telegram bot.
 */
export async function generateTelegramLinkCode(userId: string): Promise<string> {
  const code = generateCode()
  const result = await supabase.from('telegram_link_codes').insert({ code, user_id: userId }).select('code').single()
  throwIfError(result, 'Не вдалося згенерувати код.')
  return code
}

export function getIcsFeedUrl(token: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  return `${supabaseUrl}/functions/v1/ics-feed?token=${token}`
}
