import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

// Service-role client: bypasses RLS, same trust level as this app's
// Supabase Edge Functions. Every query here must be scoped to
// config.workspaceId explicitly — nothing enforces that automatically.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
