import { createContext, useContext } from 'react'
import type { WorkspaceItemRow } from '@/types/database'

export interface TreeData {
  itemMap: Map<string, WorkspaceItemRow>
  childrenMap: Map<string | null, WorkspaceItemRow[]>
}

const TreeDataContext = createContext<TreeData | null>(null)

export const TreeDataProvider = TreeDataContext.Provider

export function useTreeData(): TreeData {
  const ctx = useContext(TreeDataContext)
  if (!ctx) {
    throw new Error('useTreeData must be used within a TreeDataProvider')
  }
  return ctx
}
