import { Palette } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { COLUMN_COLORS } from '@/lib/validations/kanban'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import { useAccentColorStore } from '@/stores/accent-color-store'

export function AccentColorPicker() {
  const accentColor = useAccentColorStore((s) => s.accentColor)
  const setAccentColor = useAccentColorStore((s) => s.setAccentColor)
  const resetAccentColor = useAccentColorStore((s) => s.resetAccentColor)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title={t.appearance.accentColor} aria-label={t.appearance.accentColor}>
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t.appearance.accentColor}</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={resetAccentColor}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-xs text-muted-foreground transition-transform hover:scale-110',
              !accentColor && 'ring-2 ring-ring',
            )}
            title={t.appearance.accentDefault}
            aria-label={t.appearance.accentDefault}
          >
            ×
          </button>
          {COLUMN_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setAccentColor(color)}
              className={cn(
                'h-6 w-6 rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110',
                accentColor === color && 'ring-2 ring-ring',
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
        <Separator />
        <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {t.appearance.customColor}
          <input
            type="color"
            value={accentColor ?? '#a855f7'}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
        </label>
      </PopoverContent>
    </Popover>
  )
}
