import { NavLink } from 'react-router-dom'
import { Archive, Home, Plus, Settings, Star, Tags } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CreateItemMenu } from '@/features/workspace-tree/components/CreateItemMenu'
import { WorkspaceTree } from '@/features/workspace-tree/components/WorkspaceTree'
import { useCreateItem, useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { nextAppendPosition } from '@/features/workspace-tree/tree-utils'
import { useUiStore } from '@/stores/ui-store'
import { t } from '@/i18n'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors',
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
  )

interface SidebarContentProps {
  onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const createItem = useCreateItem()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)
  const { data: items } = useWorkspaceItems()

  function handleCreateRoot(type: Parameters<typeof createItem.mutate>[0]['type']) {
    const rootSiblings = (items ?? []).filter((item) => item.parent_id === null)
    createItem.mutate(
      { type, name: t.tree.untitledSection, parentId: null, position: nextAppendPosition(rootSiblings) },
      { onSuccess: (created) => setPendingRenameItemId(created.id) },
    )
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex flex-col gap-1 p-2">
        <NavLink to="/app/home" className={navLinkClass} onClick={onNavigate}>
          <Home className="h-4 w-4" />
          {t.nav.home}
        </NavLink>
        <NavLink to="/app/favorites" className={navLinkClass} onClick={onNavigate}>
          <Star className="h-4 w-4" />
          {t.nav.favorites}
        </NavLink>
        <NavLink to="/app/archive" className={navLinkClass} onClick={onNavigate}>
          <Archive className="h-4 w-4" />
          {t.nav.archive}
        </NavLink>
        <NavLink to="/app/tags" className={navLinkClass} onClick={onNavigate}>
          <Tags className="h-4 w-4" />
          {t.tags.title}
        </NavLink>
      </div>

      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.nav.sections}</span>
        <CreateItemMenu onSelect={handleCreateRoot} align="end">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </CreateItemMenu>
      </div>

      <ScrollArea className="flex-1 px-2">
        <WorkspaceTree />
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <NavLink to="/app/settings/profile" className={navLinkClass} onClick={onNavigate}>
          <Settings className="h-4 w-4" />
          {t.nav.settings}
        </NavLink>
      </div>
    </div>
  )
}
