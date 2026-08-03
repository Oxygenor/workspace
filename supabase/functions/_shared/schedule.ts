// Lightweight timezone helpers for the idle-nudge / digest edge functions.
// No npm timezone library — everything is derived from `Intl.DateTimeFormat`
// at call time, so DST transitions are handled automatically without any
// manual bookkeeping.

export interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number // 0=Sun..6=Sat, matches `user_days_off.weekday`
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const hourStr = get('hour')
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: hourStr === '24' ? 0 : Number(hourStr),
    minute: Number(get('minute')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  }
}

export function formatIsoDate(parts: LocalParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/**
 * Absolute UTC instant (ms since epoch) for a wall-clock date/time expressed
 * in `timeZone`. Offset-hack: treat the target wall clock as if it were UTC,
 * measure how far the real zone's wall clock drifts from that at roughly the
 * same instant, and correct for it — recomputed every call, so DST just works.
 */
export function zonedWallTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute)
  const localAtGuess = getLocalParts(new Date(asIfUtc), timeZone)
  const localAtGuessAsIfUtc = Date.UTC(
    localAtGuess.year,
    localAtGuess.month - 1,
    localAtGuess.day,
    localAtGuess.hour,
    localAtGuess.minute,
  )
  const offsetMs = localAtGuessAsIfUtc - asIfUtc
  return asIfUtc - offsetMs
}

export function parseHm(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(':').map(Number)
  return { hour, minute: minute || 0 }
}

/** Negative if `a` is earlier in the day than `b`, 0 if equal, positive if later. */
export function compareHm(a: { hour: number; minute: number }, b: { hour: number; minute: number }): number {
  return a.hour * 60 + a.minute - (b.hour * 60 + b.minute)
}

interface DayOffRow {
  specific_date: string | null
  weekday: number | null
  is_working: boolean
}

/** Resolves whether `isoDate`/`weekday` is a day off for this user, specific-date exceptions winning over the recurring weekday rule. Defaults to a working day when no rule matches. */
export async function isDayOff(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- matches the rest of this codebase's edge functions, which use an un-generic'd Supabase client
  userId: string,
  isoDate: string,
  weekday: number,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_days_off')
    .select('specific_date, weekday, is_working')
    .eq('user_id', userId)
    .or(`specific_date.eq.${isoDate},weekday.eq.${weekday}`)

  const rows = (data ?? []) as DayOffRow[]
  const specific = rows.find((r) => r.specific_date === isoDate)
  if (specific) return !specific.is_working

  const recurring = rows.find((r) => r.weekday === weekday && r.specific_date === null)
  if (recurring) return !recurring.is_working

  return false
}
