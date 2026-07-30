import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { useUiStore } from '@/stores/ui-store'
import { SidebarContent } from './SidebarContent'

export function MobileSidebarDrawer() {
  const open = useUiStore((s) => s.sidebarOpen)
  const setOpen = useUiStore((s) => s.setSidebarOpen)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar shadow-lg outline-none md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <DialogPrimitive.Title className="sr-only">Меню</DialogPrimitive.Title>
          <SidebarContent onNavigate={() => setOpen(false)} />
          <DialogPrimitive.Close className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
            <span className="sr-only">Закрити</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
