import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/use-auth'
import { queryClient } from '@/lib/query/queryClient'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import ConfigurationRequiredPage from '@/pages/ConfigurationRequiredPage'
import { router } from '@/routes/router'

export function App() {
  if (!isSupabaseConfigured) {
    return <ConfigurationRequiredPage />
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
