// Supabase Edge Function: ics-feed
//
// Public, unauthenticated (by Supabase auth) GET endpoint that serves a
// single user's calendar as an RFC 5545 iCalendar feed, so it can be added
// as an external calendar subscription in Google Calendar / Apple Calendar
// / Outlook — a much lighter alternative to a full Google OAuth sync, at
// the cost of the calendar being "pull" (refreshed on the subscriber's own
// schedule) rather than realtime.
//
// The `ics_feed_token` in the query string IS the auth: it's an
// unguessable per-user uuid (see user_integrations.ics_feed_token in
// supabase/migrations/0008_power_features.sql), acting as a bearer
// capability since calendar apps can't complete a Supabase auth flow.
// Deploy with `--no-verify-jwt` (see supabase/functions/README.md).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface VEventInput {
  uid: string
  summary: string
  description?: string | null
  dtstart: string
  dtend: string
}

// RFC 5545 §3.3.11: backslash, comma, semicolon and embedded newlines must
// be escaped in TEXT values. Backslash must be escaped first so we don't
// double-escape the escapes we just introduced.
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatICSDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}${pad(d.getUTCSeconds())}Z`
}

function buildVEvent(event: VEventInput, now: string): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSDate(event.dtstart)}`,
    `DTEND:${formatICSDate(event.dtend)}`,
    `SUMMARY:${escapeICSText(event.summary)}`,
  ]
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`)
  }
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

/** Cards/tasks only have a due date, not a range — render them as a 1-hour same-day block. */
function pseudoEventEnd(dueDateIso: string): string {
  return new Date(new Date(dueDateIso).getTime() + 60 * 60 * 1000).toISOString()
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new Response('Missing token', { status: 400, headers: corsHeaders })
  }

  const { data: integration, error } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('ics_feed_token', token)
    .maybeSingle()

  if (error) {
    console.error('ics-feed lookup error', error)
    return new Response('Internal error', { status: 500, headers: corsHeaders })
  }

  if (!integration) {
    return new Response('Not found', { status: 404, headers: corsHeaders })
  }

  const userId = integration.user_id as string
  const events: VEventInput[] = []

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  if (workspaceIds.length > 0) {
    const { data: items } = await supabase
      .from('workspace_items')
      .select('id, type')
      .in('workspace_id', workspaceIds)
      .in('type', ['calendar', 'kanban', 'task_list'])
      .is('archived_at', null)

    const calendarIds = (items ?? []).filter((i) => i.type === 'calendar').map((i) => i.id)
    const kanbanIds = (items ?? []).filter((i) => i.type === 'kanban').map((i) => i.id)
    const taskListIds = (items ?? []).filter((i) => i.type === 'task_list').map((i) => i.id)

    if (calendarIds.length > 0) {
      const { data: calendarEvents } = await supabase
        .from('calendar_events')
        .select('id, title, description, starts_at, ends_at')
        .in('calendar_id', calendarIds)

      for (const event of calendarEvents ?? []) {
        events.push({
          uid: `calendar-event-${event.id}@workspace`,
          summary: event.title as string,
          description: event.description as string | null,
          dtstart: event.starts_at as string,
          dtend: event.ends_at as string,
        })
      }
    }

    if (kanbanIds.length > 0) {
      const { data: cards } = await supabase
        .from('kanban_cards')
        .select('id, title, due_date')
        .in('board_id', kanbanIds)
        .is('archived_at', null)
        .not('due_date', 'is', null)

      for (const card of cards ?? []) {
        const dueDate = card.due_date as string
        events.push({
          uid: `kanban-card-${card.id}@workspace`,
          summary: `[Картка] ${card.title as string}`,
          dtstart: dueDate,
          dtend: pseudoEventEnd(dueDate),
        })
      }
    }

    if (taskListIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .in('task_list_id', taskListIds)
        .eq('completed', false)
        .not('due_date', 'is', null)

      for (const task of tasks ?? []) {
        const dueDate = task.due_date as string
        events.push({
          uid: `task-${task.id}@workspace`,
          summary: `[Завдання] ${task.title as string}`,
          dtstart: dueDate,
          dtend: pseudoEventEnd(dueDate),
        })
      }
    }
  }

  const now = formatICSDate(new Date().toISOString())

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Workspace//UA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.map((event) => buildVEvent(event, now)),
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="workspace.ics"',
    },
  })
})
