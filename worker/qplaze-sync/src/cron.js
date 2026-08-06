import cron from 'node-cron'
import { runSync } from './sync.js'

/** Same orchestrator as the HTTP endpoint — the scheduled and manual paths share identical logic. */
export function startCron() {
  cron.schedule('*/15 * * * *', () => {
    runSync().catch(() => {
      // runSync() already catches internally and returns an error_code —
      // this is a last-resort guard so an unhandled rejection never crashes
      // the whole process.
      console.error('qplaze-sync-worker: unexpected scheduled sync failure')
    })
  })
}
