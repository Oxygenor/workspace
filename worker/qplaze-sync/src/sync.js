import { config } from './config.js'
import { ERROR_CODES, toSyncError } from './errors.js'
import { scrapeBoard } from './scrape.js'
import { supabase } from './supabaseClient.js'

// If the newly-found card count drops by more than this fraction versus the
// last successful run, treat it as a probable selector/structure break
// rather than a quiet "success" with suspiciously few cards — silent data
// loss (e.g. a broken selector returning an empty/partial list without
// throwing) would otherwise look identical to a normal small board.
const FOUND_COUNT_DROP_THRESHOLD = 0.5

async function getLastSuccessfulFoundCount() {
  const { data } = await supabase
    .from('qplaze_sync_runs')
    .select('found_count')
    .eq('workspace_id', config.workspaceId)
    .eq('status', 'success')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.found_count ?? null
}

async function startRun() {
  const { data, error } = await supabase
    .from('qplaze_sync_runs')
    .insert({ workspace_id: config.workspaceId, status: 'running' })
    .select('id')
    .single()
  if (error || !data) throw new Error('qplaze-sync: failed to start run log')
  return data.id
}

async function finishRun(runId, status, counts, errorCode) {
  await supabase
    .from('qplaze_sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      found_count: counts.found ?? 0,
      created_count: counts.created ?? 0,
      updated_count: counts.updated ?? 0,
      skipped_count: counts.skipped ?? 0,
      error_count: status === 'error' ? 1 : 0,
      error_code: errorCode ?? null,
    })
    .eq('id', runId)
}

/** Single shared orchestrator — called identically by the HTTP endpoint (server.js) and the schedule (cron.js). */
export async function runSync() {
  const { data: runToken, error: lockError } = await supabase.rpc('qplaze_sync_acquire_lock', {
    p_workspace_id: config.workspaceId,
  })

  if (lockError || !runToken) {
    return { found: 0, created: 0, updated: 0, skipped: 0, error_code: ERROR_CODES.LOCK_BUSY }
  }

  let runId = null
  try {
    runId = await startRun()

    const cards = await scrapeBoard()
    const found = cards.length

    const lastSuccessFound = await getLastSuccessfulFoundCount()
    const droppedTooMuch =
      lastSuccessFound !== null && lastSuccessFound > 0 && found < lastSuccessFound * (1 - FOUND_COUNT_DROP_THRESHOLD)

    if (found === 0 || droppedTooMuch) {
      await finishRun(runId, 'error', { found }, ERROR_CODES.STRUCTURE_CHANGED)
      return { found, created: 0, updated: 0, skipped: 0, error_code: ERROR_CODES.STRUCTURE_CHANGED }
    }

    const { data: applyResult, error: applyError } = await supabase.rpc('qplaze_sync_apply_cards', {
      p_workspace_id: config.workspaceId,
      p_run_token: runToken,
      p_cards: cards.map((c) => ({ source_id: c.sourceId, title: c.title, source_url: c.sourceUrl })),
    })

    if (applyError) {
      await finishRun(runId, 'error', { found }, ERROR_CODES.INTERNAL)
      return { found, created: 0, updated: 0, skipped: 0, error_code: ERROR_CODES.INTERNAL }
    }

    if (applyResult?.error) {
      const errorCode = applyResult.error === 'no_target_column' ? ERROR_CODES.NO_TARGET_COLUMN : ERROR_CODES.INTERNAL
      await finishRun(runId, 'error', { found }, errorCode)
      return { found, created: 0, updated: 0, skipped: 0, error_code: errorCode }
    }

    const counts = {
      found: applyResult.found ?? found,
      created: applyResult.created ?? 0,
      updated: applyResult.updated ?? 0,
      skipped: applyResult.skipped ?? 0,
    }
    await finishRun(runId, 'success', counts, null)
    return { ...counts, error_code: null }
  } catch (error) {
    const syncError = toSyncError(error)
    if (runId) await finishRun(runId, 'error', {}, syncError.code)
    return { found: 0, created: 0, updated: 0, skipped: 0, error_code: syncError.code }
  } finally {
    await supabase.rpc('qplaze_sync_release_lock', { p_workspace_id: config.workspaceId, p_run_token: runToken })
  }
}
