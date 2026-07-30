import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { t } from '@/i18n'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="h-6 w-6" />
      </span>
      <h1 className="text-lg font-semibold text-foreground">{t.errors.notFoundTitle}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t.errors.notFoundDescription}</p>
      <Button asChild>
        <Link to="/app/home">{t.errors.goHome}</Link>
      </Button>
    </div>
  )
}
