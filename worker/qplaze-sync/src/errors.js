// Fixed set of error codes shared with `qplaze_sync_runs.error_code` in the
// database (see supabase/migrations/0023_qplaze_sync.sql) and the frontend's
// error-message mapping (src/features/kanban/hooks.ts). Every catch boundary
// in this worker must throw (or convert into) one of these — NEVER let a
// raw Playwright/network error's `.message` escape to a log line, the sync
// run row, or an HTTP response. Playwright auto-attaches page/ARIA snapshots
// to some timeout errors, which can embed real card titles.
export const ERROR_CODES = {
  LOGIN_FAILED: 'login_failed',
  CAPTCHA_DETECTED: 'captcha_detected',
  STRUCTURE_CHANGED: 'structure_changed',
  LOCK_BUSY: 'lock_busy',
  NO_TARGET_COLUMN: 'no_target_column',
  INTERNAL: 'internal',
}

export class SyncError extends Error {
  constructor(code) {
    super(code)
    this.name = 'SyncError'
    this.code = code
  }
}

/** Converts any thrown value into a safe SyncError, discarding the original error's message/stack. */
export function toSyncError(error) {
  if (error instanceof SyncError) return error
  return new SyncError(ERROR_CODES.INTERNAL)
}
