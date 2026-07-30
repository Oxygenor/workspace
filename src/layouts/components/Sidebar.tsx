import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'
import { SidebarContent } from './SidebarContent'

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed)

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
        collapsed ? 'w-10' : 'w-64',
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex h-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        title={collapsed ? 'Розгорнути бічну панель' : 'Згорнути бічну панель'}
        aria-label={collapsed ? 'Розгорнути бічну панель' : 'Згорнути бічну панель'}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
      <div className={cn('min-h-0 flex-1 overflow-hidden', collapsed && 'invisible')}>
        <SidebarContent />
      </div>
    </aside>
  )
}
