import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KanbanSquare } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { resolveIcon } from '@/lib/modules/icon-map'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { useCardSearch } from '../hooks'
import { useUiStore } from '@/stores/ui-store'
import { t } from '@/i18n'

export function GlobalSearch() {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const { data: items } = useWorkspaceItems()
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { data: cardResults } = useCardSearch(debouncedQuery)
  const navigate = useNavigate()

  const setDebounced = useDebouncedCallback((value: string) => setDebouncedQuery(value), 300)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t.search.placeholder} onValueChange={setDebounced} />
      <CommandList>
        <CommandEmpty>{t.search.noResults}</CommandEmpty>
        <CommandGroup heading={t.nav.sections}>
          {(items ?? []).map((item) => {
            const Icon = resolveIcon(item.icon, item.type)
            return (
              <CommandItem
                key={item.id}
                value={item.name}
                onSelect={() => {
                  setOpen(false)
                  navigate(`/app/item/${item.id}`)
                }}
              >
                <Icon />
                {item.name}
              </CommandItem>
            )
          })}
        </CommandGroup>

        {cardResults && cardResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t.search.cards}>
              {cardResults.map((card) => (
                <CommandItem
                  key={card.id}
                  value={`${card.card_number} ${card.title}`}
                  onSelect={() => {
                    setOpen(false)
                    navigate(`/app/item/${card.board_id}`)
                  }}
                >
                  <KanbanSquare />
                  #{card.card_number} {card.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
