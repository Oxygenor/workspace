import { useNavigate } from 'react-router-dom'
import { Bell, LayoutGrid, Menu, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CreateItemMenu } from '@/features/workspace-tree/components/CreateItemMenu'
import { useCreateItem, useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { nextAppendPosition } from '@/features/workspace-tree/tree-utils'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import { useUiStore } from '@/stores/ui-store'
import { t } from '@/i18n'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

export function Topbar() {
  const { workspace } = useCurrentWorkspace()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)
  const { data: items } = useWorkspaceItems()
  const createItem = useCreateItem()
  const navigate = useNavigate()

  function handleCreateRoot(type: Parameters<typeof createItem.mutate>[0]['type']) {
    const rootSiblings = (items ?? []).filter((item) => item.parent_id === null)
    createItem.mutate(
      { type, name: t.tree.untitledSection, parentId: null, position: nextAppendPosition(rootSiblings) },
      {
        onSuccess: (created) => {
          setPendingRenameItemId(created.id)
          navigate(`/app/item/${created.id}`)
        },
      },
    )
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar} aria-label="Меню">
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 font-semibold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutGrid className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">{t.common.appName}</span>
      </div>

      {workspace && (
        <>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">{workspace.name}</span>
        </>
      )}

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="ml-2 flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent md:max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span className="hidden truncate sm:inline">{t.topbar.searchPlaceholder}</span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <CreateItemMenu onSelect={handleCreateRoot} align="end">
          <Button size="sm" className="hidden sm:inline-flex">
            {t.common.create}
          </Button>
        </CreateItemMenu>
        <CreateItemMenu onSelect={handleCreateRoot} align="end">
          <Button size="icon" variant="default" className="sm:hidden">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </CreateItemMenu>

        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t.topbar.notifications}>
              <Bell className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 text-sm text-muted-foreground">
            {t.topbar.noNotifications}
          </PopoverContent>
        </Popover>

        <UserMenu />
      </div>
    </header>
  )
}
