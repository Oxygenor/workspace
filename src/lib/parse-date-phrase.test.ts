import { describe, expect, it } from 'vitest'

import { formatDateKey, parseDatePhrase } from './parse-date-phrase'

const NOW = new Date(2026, 6, 30) // Thursday, 2026-07-30

describe('parseDatePhrase', () => {
  it('recognizes "завтра" and strips it from the text', () => {
    const result = parseDatePhrase('купити хліб завтра', NOW)
    expect(result.cleanedText).toBe('купити хліб')
    expect(result.date).not.toBeNull()
    expect(formatDateKey(result.date!)).toBe('2026-07-31')
  })

  it('recognizes "через N дні" and strips it from the text', () => {
    const result = parseDatePhrase('зателефонувати через 3 дні', NOW)
    expect(result.cleanedText).toBe('зателефонувати')
    expect(result.date).not.toBeNull()
    expect(formatDateKey(result.date!)).toBe('2026-08-02')
  })

  it('returns null date and unchanged text when nothing matches', () => {
    const result = parseDatePhrase('нічого особливого', NOW)
    expect(result.date).toBeNull()
    expect(result.cleanedText).toBe('нічого особливого')
  })

  it('recognizes "сьогодні"', () => {
    const result = parseDatePhrase('здати звіт сьогодні', NOW)
    expect(formatDateKey(result.date!)).toBe('2026-07-30')
  })

  it('recognizes "післязавтра" without also matching "завтра"', () => {
    const result = parseDatePhrase('зустріч післязавтра', NOW)
    expect(result.cleanedText).toBe('зустріч')
    expect(formatDateKey(result.date!)).toBe('2026-08-01')
  })

  it('recognizes a weekday phrase and rolls over to next week when today is that weekday', () => {
    // NOW is Thursday, so "у четвер" should resolve to next Thursday.
    const result = parseDatePhrase('нарада у четвер', NOW)
    expect(result.cleanedText).toBe('нарада')
    expect(formatDateKey(result.date!)).toBe('2026-08-06')
  })
})
