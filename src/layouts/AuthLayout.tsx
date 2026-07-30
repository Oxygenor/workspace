import { Outlet } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'

import { t } from '@/i18n'

export function AuthLayout() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="h-5 w-5" />
          </span>
          {t.common.appName}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
