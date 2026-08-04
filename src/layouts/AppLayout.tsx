import { Outlet } from 'react-router-dom'

import { OfflineBanner } from '@/components/OfflineBanner'
import { ReminderChecker } from '@/features/calendar/components/ReminderChecker'
import { QuickCaptureDialog } from '@/features/inbox/components/QuickCaptureDialog'
import { GlobalSearch } from '@/features/search/components/GlobalSearch'
import { PomodoroEngine } from '@/features/time/components/PomodoroEngine'
import { GlobalHotkeys } from '@/features/workspace-tree/components/GlobalHotkeys'
import { MobileSidebarDrawer } from './components/MobileSidebarDrawer'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'

export function AppLayout() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <OfflineBanner />
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileSidebarDrawer />
      <GlobalSearch />
      <QuickCaptureDialog />
      <GlobalHotkeys />
      <ReminderChecker />
      <PomodoroEngine />
    </div>
  )
}
