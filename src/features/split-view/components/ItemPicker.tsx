import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import type { WorkspaceItemRow } from '@/types/database'

interface ItemPickerProps {
  items: WorkspaceItemRow[]
  onSelect: (itemId: string) => void
}

export function ItemPicker({ items, onSelect }: ItemPickerProps) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim().toLowerCase()
  const filtered = trimmed ? items.filter((item) => item.name.toLowerCase().includes(trimmed)) : items

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <h2 className="text-sm font-medium text-foreground">{t.splitView.pickItem}</h2>
      <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.splitView.pickPlaceholder} />
      <div className="flex-1 overflow-y-auto rounded-md border border-border">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">{t.search.noResults}</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((item) => {
              const Icon = resolveIcon(item.icon, item.type)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onSelect(item.id)}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
