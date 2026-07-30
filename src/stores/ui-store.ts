import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  /** Mobile-only drawer open state (the desktop sidebar is always visible). Intentionally not persisted. */
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  expandedItemIds: Record<string, boolean>
  toggleExpanded: (itemId: string) => void
  setExpanded: (itemId: string, expanded: boolean) => void

  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  pendingRenameItemId: string | null
  setPendingRenameItemId: (itemId: string | null) => void

  activeWorkspaceId: string | null
  setActiveWorkspaceId: (workspaceId: string | null) => void

  recentItemIds: string[]
  pushRecentItem: (itemId: string) => void
}

const MAX_RECENT_ITEMS = 8

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

      expandedItemIds: {},
      toggleExpanded: (itemId) =>
        set((state) => ({
          expandedItemIds: { ...state.expandedItemIds, [itemId]: !state.expandedItemIds[itemId] },
        })),
      setExpanded: (itemId, expanded) =>
        set((state) => ({ expandedItemIds: { ...state.expandedItemIds, [itemId]: expanded } })),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      pendingRenameItemId: null,
      setPendingRenameItemId: (itemId) => set({ pendingRenameItemId: itemId }),

      activeWorkspaceId: null,
      setActiveWorkspaceId: (workspaceId) => set({ activeWorkspaceId: workspaceId }),

      recentItemIds: [],
      pushRecentItem: (itemId) =>
        set((state) => ({
          recentItemIds: [itemId, ...state.recentItemIds.filter((id) => id !== itemId)].slice(0, MAX_RECENT_ITEMS),
        })),
    }),
    {
      name: 'workspace-ui',
      partialize: (state) => ({
        expandedItemIds: state.expandedItemIds,
        activeWorkspaceId: state.activeWorkspaceId,
        recentItemIds: state.recentItemIds,
      }),
    },
  ),
)
