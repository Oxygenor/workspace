import { config } from './config.js'
import { ERROR_CODES, toSyncError } from './errors.js'
import { scrapeBoard } from './scrape.js'
import { supabase } from './supabaseClient.js'
import { sendTelegramMessage } from './telegram.js'

function formatMovedMessage(moved) {
  if (moved.length === 1) {
    const m = moved[0]
    return `🔄 Вашу картку «${m.title}» перенесено з «${m.from_column}» у «${m.to_column}» (синхронізація Qplaze)`
  }
  const lines = ['🔄 Ваші картки перенесено (синхронізація Qplaze):']
  for (const m of moved) {
    lines.push(`• «${m.title}»: «${m.from_column}» → «${m.to_column}»`)
  }
  return lines.join('\n')
}

/** Notifies every workspace member with Telegram linked about cards that changed column this run. Best-effort — never throws. */
async function notifyColumnMoves(moved) {
  if (!Array.isArray(moved) || moved.length === 0) return
  try {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', config.workspaceId)
    const userIds = (members ?? []).map((m) => m.user_id)
    if (userIds.length === 0) return

    const { data: integrations } = await supabase
      .from('user_integrations')
      .select('telegram_chat_id')
      .in('user_id', userIds)
      .not('telegram_chat_id', 'is', null)

    const chatIds = (integrations ?? []).map((i) => i.telegram_chat_id).filter(Boolean)
    if (chatIds.length === 0) return

    const message = formatMovedMessage(moved)
    for (const chatId of chatIds) {
      await sendTelegramMessage(chatId, message)
    }
  } catch (error) {
    console.error('qplaze-sync-worker: notifyColumnMoves failed', error instanceof Error ? error.message : '')
  }
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
    // PostgrestError.message/.code are safe to log (SQL/API diagnostics,
    // never secrets) and are the only way to tell "already locked" apart
    // from a real config/connectivity problem (bad workspace id, bad
    // service-role key, etc.) without guessing.
    if (lockError) {
      console.error('qplaze-sync-worker: acquire_lock RPC error', lockError.code, lockError.message)
    } else {
      console.log('qplaze-sync-worker: lock already held (another sync in progress or recently ran)')
    }
    return { found: 0, created: 0, updated: 0, skipped: 0, error_code: ERROR_CODES.LOCK_BUSY }
  }

  let runId = null
  try {
    runId = await startRun()

    const cards = await scrapeBoard()
    const found = cards.length

    // "found" is now just this one person's assigned cards (a small,
    // naturally fluctuating number as cards get (re)assigned/archived on
    // the Qplaze side) rather than the whole board, so a relative-drop
    // check would misfire on normal day-to-day changes. Only a total wipeout
    // (0 found) is treated as a likely scrape/selector break — anything
    // else is accepted at face value.
    if (found === 0) {
      await finishRun(runId, 'error', { found }, ERROR_CODES.STRUCTURE_CHANGED)
      return { found, created: 0, updated: 0, skipped: 0, error_code: ERROR_CODES.STRUCTURE_CHANGED }
    }

    const { data: applyResult, error: applyError } = await supabase.rpc('qplaze_sync_apply_cards', {
      p_workspace_id: config.workspaceId,
      p_run_token: runToken,
      p_cards: cards.map((c) => ({
        source_id: c.sourceId,
        title: c.title,
        source_url: c.sourceUrl,
        qplaze_list_id: c.qplazeListId,
      })),
    })

    if (applyError) {
      console.error('qplaze-sync-worker: apply_cards RPC error', applyError.code, applyError.message)
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
    await notifyColumnMoves(applyResult.moved)
    return { ...counts, error_code: null }
  } catch (error) {
    const syncError = toSyncError(error)
    // Safe to log .message here specifically: by this point the only
    // non-SyncError sources are this file's own thrown Errors (e.g.
    // startRun's failure message) — scrapeBoard() already scrubs anything
    // Playwright-originated (which can embed page content) before it gets
    // this far, converting it into a SyncError first.
    console.error('qplaze-sync-worker: run failed', syncError.code, error instanceof Error ? error.message : '')
    if (runId) await finishRun(runId, 'error', {}, syncError.code)
    return { found: 0, created: 0, updated: 0, skipped: 0, error_code: syncError.code }
  } finally {
    await supabase.rpc('qplaze_sync_release_lock', { p_workspace_id: config.workspaceId, p_run_token: runToken })
  }
}
