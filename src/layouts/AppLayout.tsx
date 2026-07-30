import { Outlet } from 'react-router-dom'

import { GlobalSearch } from '@/features/search/components/GlobalSearch'
import { GlobalHotkeys } from '@/features/workspace-tree/components/GlobalHotkeys'
import { MobileSidebarDrawer } from './components/MobileSidebarDrawer'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'

export function AppLayout() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileSidebarDrawer />
      <GlobalSearch />
      <GlobalHotkeys />
    </div>
  )
}
