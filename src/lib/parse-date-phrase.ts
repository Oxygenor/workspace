/**
 * Recognizes simple Ukrainian natural-language date phrases anywhere in a string
 * (case-insensitive) and strips the matched phrase out of the text.
 *
 * Used by the task quick-add input so a user can type e.g. "купити хліб завтра"
 * and have the due date extracted automatically.
 */

export interface ParseDatePhraseResult {
  /** The input text with the recognized date phrase removed (whitespace collapsed). */
  cleanedText: string
  /** The resolved date, or `null` if no phrase was recognized. */
  date: Date | null
}

const WEEKDAYS: Record<string, number> = {
  неділю: 0,
  понеділок: 1,
  вівторок: 2,
  середу: 3,
  четвер: 4,
  "п'ятницю": 5,
  суботу: 6,
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Next occurrence of `targetDay` (0=Sunday..6=Saturday) strictly after today. */
function nextWeekday(today: Date, targetDay: number): Date {
  const diff = (targetDay - today.getDay() + 7) % 7 || 7
  return addDays(today, diff)
}

interface DateRule {
  pattern: RegExp
  resolve: (match: RegExpMatchArray, today: Date) => Date
}

const RULES: DateRule[] = [
  { pattern: /післязавтра/i, resolve: (_m, today) => addDays(today, 2) },
  { pattern: /через\s+тиждень/i, resolve: (_m, today) => addDays(today, 7) },
  {
    pattern: /через\s+(\d+)\s+(?:днів|дні|день|дня)/i,
    resolve: (m, today) => addDays(today, Number(m[1])),
  },
  { pattern: /завтра/i, resolve: (_m, today) => addDays(today, 1) },
  { pattern: /сьогодні/i, resolve: (_m, today) => today },
  {
    pattern: /(?:в|у)\s+(понеділок|вівторок|середу|четвер|п'ятницю|суботу|неділю)/i,
    resolve: (m, today) => nextWeekday(today, WEEKDAYS[m[1].toLowerCase()]),
  },
]

export function parseDatePhrase(text: string, now: Date = new Date()): ParseDatePhraseResult {
  const today = startOfDay(now)

  for (const rule of RULES) {
    const match = text.match(rule.pattern)
    if (match && match.index !== undefined) {
      const cleanedText = (text.slice(0, match.index) + text.slice(match.index + match[0].length))
        .replace(/\s{2,}/g, ' ')
        .trim()
      return { cleanedText, date: rule.resolve(match, today) }
    }
  }

  return { cleanedText: text, date: null }
}

/** Formats a `Date` as a `YYYY-MM-DD` key, matching the app's date-only input convention. */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
