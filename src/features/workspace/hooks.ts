import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { useUiStore } from '@/stores/ui-store'
import { fetchMyWorkspaces, fetchWorkspaceMembers, renameWorkspace } from './api'

export function useWorkspaces() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.workspaces(),
    queryFn: fetchMyWorkspaces,
    enabled: Boolean(user),
  })
}

export function useCurrentWorkspace() {
  const { data: workspaces, ...rest } = useWorkspaces()
  const activeWorkspaceId = useUiStore((s) => s.activeWorkspaceId)
  const setActiveWorkspaceId = useUiStore((s) => s.setActiveWorkspaceId)

  const resolved = workspaces?.find((w) => w.id === activeWorkspaceId) ?? workspaces?.[0]

  useEffect(() => {
    if (resolved && resolved.id !== activeWorkspaceId) {
      setActiveWorkspaceId(resolved.id)
    }
  }, [resolved, activeWorkspaceId, setActiveWorkspaceId])

  return { workspace: resolved, workspaces, ...rest }
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaceMembers(workspaceId),
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: Boolean(workspaceId),
  })
}

export function useRenameWorkspace(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => renameWorkspace(workspaceId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces() })
      toast.success('Назву Workspace оновлено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
