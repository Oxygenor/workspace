import { create } from 'zustand'

import { EMPTY_FILTERS, type KanbanFilters } from '@/features/kanban/types'

export type KanbanSortMode = 'manual' | 'due' | 'priority' | 'title'

interface KanbanFiltersState {
  filtersByBoard: Record<string, KanbanFilters>
  searchByBoard: Record<string, string>
  sortByBoard: Record<string, KanbanSortMode>
  setFilter: (boardId: string, patch: Partial<KanbanFilters>) => void
  clearFilters: (boardId: string) => void
  setSearch: (boardId: string, query: string) => void
  setSort: (boardId: string, mode: KanbanSortMode) => void
}

export const useKanbanFiltersStore = create<KanbanFiltersState>((set) => ({
  filtersByBoard: {},
  searchByBoard: {},
  sortByBoard: {},
  setFilter: (boardId, patch) =>
    set((state) => ({
      filtersByBoard: {
        ...state.filtersByBoard,
        [boardId]: { ...(state.filtersByBoard[boardId] ?? EMPTY_FILTERS), ...patch },
      },
    })),
  clearFilters: (boardId) =>
    set((state) => ({ filtersByBoard: { ...state.filtersByBoard, [boardId]: EMPTY_FILTERS } })),
  setSearch: (boardId, query) =>
    set((state) => ({ searchByBoard: { ...state.searchByBoard, [boardId]: query } })),
  setSort: (boardId, mode) => set((state) => ({ sortByBoard: { ...state.sortByBoard, [boardId]: mode } })),
}))
