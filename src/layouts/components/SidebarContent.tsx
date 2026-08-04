import { NavLink } from 'react-router-dom'
import { Archive, CalendarCheck, Clock4, Home, Inbox, Plus, Settings, Star, Tags } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CreateItemMenu } from '@/features/workspace-tree/components/CreateItemMenu'
import { WorkspaceTree } from '@/features/workspace-tree/components/WorkspaceTree'
import { useCreateItem, useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { nextAppendPosition } from '@/features/workspace-tree/tree-utils'
import { useCreateFromSectionTemplate } from '@/features/templates/hooks'
import { useInboxItems } from '@/features/inbox/hooks'
import { useUiStore } from '@/stores/ui-store'
import { t } from '@/i18n'

function navLinkClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-8 items-center gap-2 rounded-md text-sm font-medium transition-colors',
      collapsed ? 'justify-center px-0' : 'px-2',
      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
    )
}

interface SidebarContentProps {
  onNavigate?: () => void
  collapsed?: boolean
}

export function SidebarContent({ onNavigate, collapsed = false }: SidebarContentProps) {
  const createItem = useCreateItem()
  const createFromTemplate = useCreateFromSectionTemplate()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)
  const { data: items } = useWorkspaceItems()
  const { data: inboxItems } = useInboxItems()
  const inboxCount = inboxItems?.length ?? 0

  function handleCreateRoot(type: Parameters<typeof createItem.mutate>[0]['type']) {
    const rootSiblings = (items ?? []).filter((item) => item.parent_id === null)
    createItem.mutate(
      { type, name: t.tree.untitledSection, parentId: null, position: nextAppendPosition(rootSiblings) },
      { onSuccess: (created) => setPendingRenameItemId(created.id) },
    )
  }

  function handleCreateRootFromTemplate(template: Parameters<typeof createFromTemplate.mutate>[0]['template']) {
    const rootSiblings = (items ?? []).filter((item) => item.parent_id === null)
    createFromTemplate.mutate({ template, parentId: null, position: nextAppendPosition(rootSiblings) })
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex flex-col gap-1 p-2">
        <NavLink to="/app/home" className={navLinkClass(collapsed)} onClick={onNavigate} title={collapsed ? t.nav.home : undefined}>
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && t.nav.home}
        </NavLink>
        <NavLink to="/app/favorites" className={navLinkClass(collapsed)} onClick={onNavigate} title={collapsed ? t.nav.favorites : undefined}>
          <Star className="h-4 w-4 shrink-0" />
          {!collapsed && t.nav.favorites}
        </NavLink>
        <NavLink to="/app/inbox" className={navLinkClass(collapsed)} onClick={onNavigate} title={collapsed ? t.nav.inbox : undefined}>
          <span className="relative shrink-0">
            <Inbox className="h-4 w-4" />
            {collapsed && inboxCount > 0 && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
            )}
          </span>
          {!collapsed && (
            <span className="flex flex-1 items-center justify-between">
              <span>{t.nav.inbox}</span>
              {inboxCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              )}
            </span>
          )}
        </NavLink>
        <NavLink to="/app/archive" className={navLinkClass(collapsed)} onClick={onNavigate} title={collapsed ? t.nav.archive : undefined}>
          <Archive className="h-4 w-4 shrink-0" />
          {!collapsed && t.nav.archive}
        </NavLink>
        <NavLink to="/app/tags" className={navLinkClass(collapsed)} onClick={onNavigate} title={collapsed ? t.tags.title : undefined}>
          <Tags className="h-4 w-4 shrink-0" />
          {!collapsed && t.tags.title}
        </NavLink>
        <NavLink
          to="/app/reports/time"
          className={navLinkClass(collapsed)}
          onClick={onNavigate}
          title={collapsed ? t.reports.navTimeReport : undefined}
        >
          <Clock4 className="h-4 w-4 shrink-0" />
          {!collapsed && t.reports.navTimeReport}
        </NavLink>
        <NavLink
          to="/app/reports/weekly-review"
          className={navLinkClass(collapsed)}
          onClick={onNavigate}
          title={collapsed ? t.reports.navWeeklyReview : undefined}
        >
          <CalendarCheck className="h-4 w-4 shrink-0" />
          {!collapsed && t.reports.navWeeklyReview}
        </NavLink>
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center justify-between px-3 pb-1 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.nav.sections}</span>
            <CreateItemMenu onSelect={handleCreateRoot} onSelectTemplate={handleCreateRootFromTemplate} align="end">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </CreateItemMenu>
          </div>

          <ScrollArea className="flex-1 px-2">
            <WorkspaceTree />
          </ScrollArea>
        </>
      )}

      <div className="mt-auto border-t border-sidebar-border p-2">
        <NavLink
          to="/app/settings/profile"
          className={navLinkClass(collapsed)}
          onClick={onNavigate}
          title={collapsed ? t.nav.settings : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && t.nav.settings}
        </NavLink>
      </div>
    </div>
  )
}
