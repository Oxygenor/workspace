import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  const theme: ToasterProps['theme'] = document.documentElement.classList.contains('dark') ? 'dark' : 'light'

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'hsl(var(--popover))',
          '--normal-text': 'hsl(var(--popover-foreground))',
          '--normal-border': 'hsl(var(--border))',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
