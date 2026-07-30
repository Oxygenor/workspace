import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/features/auth/use-auth'

/**
 * Renders at "/". Must wait for `loading` before navigating anywhere —
 * an unconditional `<Navigate>` here would replace the URL (and its hash)
 * before Supabase finishes parsing a `#access_token=...` email-confirmation
 * link, silently dropping the session and bouncing the user back to /login.
 */
export function RootRedirect() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return <Navigate to={session ? '/app/home' : '/login'} replace />
}
