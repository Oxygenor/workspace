const REQUIRED_VARS = [
  'QPLAZE_LOGIN',
  'QPLAZE_PASSWORD',
  'QPLAZE_BOARD_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WORKSPACE_ID',
  'SYNC_API_KEY',
]

for (const name of REQUIRED_VARS) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`)
  }
}

export const config = {
  qplazeLogin: process.env.QPLAZE_LOGIN,
  qplazePassword: process.env.QPLAZE_PASSWORD,
  qplazeBoardUrl: process.env.QPLAZE_BOARD_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  workspaceId: process.env.WORKSPACE_ID,
  syncApiKey: process.env.SYNC_API_KEY,
  port: Number(process.env.PORT) || 8080,
}
