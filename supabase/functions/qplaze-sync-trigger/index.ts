// Supabase Edge Function: qplaze-sync-trigger
//
// Bridges the authenticated frontend (which only ever talks to Supabase)
// and the separate Node/Playwright worker that performs the actual
// Kanboard scrape (kept outside Supabase's Deno runtime, which can't run a
// real browser). Deployed WITHOUT --no-verify-jwt — unlike
// telegram-webhook/telegram-digest/idle-nudge/card-reset (invoked by
// callers that can't send a Supabase JWT), this one is only ever called
// by our own logged-in SPA via `supabase.functions.invoke(...)`, so
// Supabase's platform verifies the caller before the request reaches
// this code.
//
// The worker's URL and shared API key live only as this function's
// secrets (`supabase secrets set`) — never in the frontend bundle.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const WORKER_URL = Deno.env.get('QPLAZE_WORKER_URL') ?? ''
const SYNC_API_KEY = Deno.env.get('QPLAZE_SYNC_API_KEY') ?? ''

// Generous enough for a small-board Playwright scrape, but bounded so a
// hung worker doesn't tie up the edge function indefinitely. If real-world
// scrapes routinely exceed this, switch to a fire-and-forget trigger +
// polling `qplaze_sync_runs` from the client instead of awaiting inline.
const WORKER_TIMEOUT_MS = 90_000

interface WorkerResponse {
  found?: number
  created?: number
  updated?: number
  skipped?: number
  error_code?: string
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const jsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error_code: 'internal' }, 401)

    // Scoped to the caller's own session — RLS decides what they can see.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ error_code: 'internal' }, 401)
    }

    const { data: memberships } = await userClient.from('workspace_members').select('workspace_id').limit(1)
    const workspaceId = memberships?.[0]?.workspace_id as string | undefined
    if (!workspaceId) {
      return jsonResponse({ error_code: 'internal' }, 400)
    }

    if (!WORKER_URL || !SYNC_API_KEY) {
      console.error('qplaze-sync-trigger: QPLAZE_WORKER_URL/QPLAZE_SYNC_API_KEY not configured')
      return jsonResponse({ error_code: 'internal' }, 500)
    }

    let workerRes: Response
    try {
      workerRes = await fetch(`${WORKER_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SYNC_API_KEY}` },
        body: JSON.stringify({ workspace_id: workspaceId }),
        signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
      })
    } catch (fetchError) {
      console.error('qplaze-sync-trigger: worker unreachable', fetchError)
      return jsonResponse({ error_code: 'internal' }, 502)
    }

    const workerBody = (await workerRes.json().catch(() => null)) as WorkerResponse | null

    if (!workerRes.ok || !workerBody) {
      return jsonResponse({ error_code: workerBody?.error_code ?? 'internal' }, 502)
    }

    // Relay only this fixed, sanitized shape — never anything else the
    // worker might return (e.g. it must never be able to smuggle raw
    // error text through to the frontend).
    return jsonResponse({
      found: workerBody.found ?? 0,
      created: workerBody.created ?? 0,
      updated: workerBody.updated ?? 0,
      skipped: workerBody.skipped ?? 0,
      error_code: workerBody.error_code ?? null,
    })
  } catch (error) {
    console.error('qplaze-sync-trigger error', error)
    return jsonResponse({ error_code: 'internal' }, 500)
  }
})
