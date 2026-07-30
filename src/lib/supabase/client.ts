import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    'Відсутні змінні середовища VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Скопіюйте .env.example у .env і заповніть значення.',
  )
}

// Falls back to a syntactically valid placeholder so `createClient` itself
// never throws at import time — every module in the app transitively
// imports this file, so a throw here would blank the whole app instead of
// letting <ConfigurationRequired> render a helpful setup screen.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
