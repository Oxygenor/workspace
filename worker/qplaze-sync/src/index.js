import './config.js' // validates required env vars, fails fast if missing
import { startCron } from './cron.js'
import { startServer } from './server.js'

startServer()
startCron()
