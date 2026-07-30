import type { PostgrestError } from '@supabase/supabase-js'

export class SupabaseQueryError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'SupabaseQueryError'
    this.code = code
  }
}

const KNOWN_MESSAGES: Record<string, string> = {
  '23505': 'Такий запис уже існує.',
  '23503': 'Пов’язаний запис не знайдено або він був видалений.',
  '42501': 'Недостатньо прав для виконання цієї дії.',
  PGRST116: 'Запис не знайдено.',
}

export function toAppError(error: PostgrestError | Error | null | undefined, fallback = 'Сталася помилка. Спробуйте ще раз.'): SupabaseQueryError {
  if (!error) {
    return new SupabaseQueryError(fallback)
  }

  if ('code' in error && error.code && KNOWN_MESSAGES[error.code]) {
    return new SupabaseQueryError(KNOWN_MESSAGES[error.code], error.code)
  }

  const message = error.message?.trim()
  return new SupabaseQueryError(message && message.length > 0 ? message : fallback, 'code' in error ? error.code : undefined)
}

export function throwIfError<T>(result: { data: T | null; error: PostgrestError | null }, fallback?: string): T {
  if (result.error) {
    throw toAppError(result.error, fallback)
  }
  if (result.data === null) {
    throw toAppError(null, fallback)
  }
  return result.data
}
