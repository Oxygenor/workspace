import type { ReactNode } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ICON_MAP, ICON_PICKER_OPTIONS } from '@/lib/modules/icon-map'
import { COLUMN_COLORS } from '@/lib/validations/kanban'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  color?: string
  onColorChange?: (color: string) => void
  children: ReactNode
}

export function IconPicker({ value, onChange, color, onColorChange, children }: IconPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        {onColorChange && (
          <>
            <div className="flex flex-wrap gap-1.5 pb-2">
              {COLUMN_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onColorChange(swatch)}
                  className={cn(
                    'h-6 w-6 rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110',
                    color === swatch && 'ring-2 ring-ring',
                  )}
                  style={{ backgroundColor: swatch }}
                  aria-label={swatch}
                />
              ))}
            </div>
            <Separator className="mb-2" />
          </>
        )}
        <div className="grid grid-cols-6 gap-1">
          {ICON_PICKER_OPTIONS.map((name) => {
            const Icon = ICON_MAP[name]
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                  value === name && 'bg-accent text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" style={color ? { color } : undefined} />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
