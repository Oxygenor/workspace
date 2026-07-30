import type { ReactNode } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ICON_MAP, ICON_PICKER_OPTIONS } from '@/lib/modules/icon-map'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  children: ReactNode
}

export function IconPicker({ value, onChange, children }: IconPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64" align="start">
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
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
