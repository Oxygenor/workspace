import { describe, expect, it } from 'vitest'
import type { PostgrestError } from '@supabase/supabase-js'

import { SupabaseQueryError, throwIfError, toAppError } from './errors'

function makePostgrestError(overrides: Partial<PostgrestError>): PostgrestError {
  const base = { message: '', details: '', hint: '', code: '', name: 'PostgrestError', ...overrides }
  return { ...base, toJSON: () => base }
}

describe('toAppError', () => {
  it('maps a known Postgres error code to a friendly Ukrainian message', () => {
    const error = toAppError(makePostgrestError({ code: '23505', message: 'duplicate key' }))
    expect(error.message).toBe('Такий запис уже існує.')
  })

  it('falls back to the raw message for unknown error codes', () => {
    const error = toAppError(makePostgrestError({ code: 'XYZ', message: 'something odd happened' }))
    expect(error.message).toBe('something odd happened')
  })

  it('uses the fallback message when there is no error at all', () => {
    const error = toAppError(null, 'Кастомна помилка')
    expect(error.message).toBe('Кастомна помилка')
  })
})

describe('throwIfError — RLS-style "no access" responses', () => {
  it('throws when Postgres returns a permission-denied error (as it would for a foreign workspace)', () => {
    // Row Level Security silently excludes rows the user isn't a member of,
    // so a direct .single() query against someone else's workspace comes
    // back as PGRST116 ("no rows found"), not as a special "403" — this
    // asserts our client-side plumbing turns that into a thrown, user-facing
    // error instead of silently returning undefined/garbage data.
    const result = { data: null, error: makePostgrestError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }) }
    expect(() => throwIfError(result, 'Не вдалося завантажити Workspace.')).toThrow(SupabaseQueryError)
    try {
      throwIfError(result, 'Не вдалося завантажити Workspace.')
    } catch (error) {
      expect((error as SupabaseQueryError).message).toBe('Запис не знайдено.')
    }
  })

  it('throws the fallback message when data is unexpectedly null without an explicit error', () => {
    const result = { data: null, error: null }
    expect(() => throwIfError(result, 'Не вдалося завантажити Workspace.')).toThrow('Не вдалося завантажити Workspace.')
  })

  it('returns the data unchanged when there is no error', () => {
    const result = { data: { id: 'ws-1' }, error: null }
    expect(throwIfError(result)).toEqual({ id: 'ws-1' })
  })
})
