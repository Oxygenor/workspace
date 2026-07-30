import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme-store'
import { t } from '@/i18n'

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={t.topbar.toggleTheme}
      aria-label={t.topbar.toggleTheme}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
