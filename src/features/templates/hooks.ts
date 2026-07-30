import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { useCurrentWorkspace } from '@/features/workspace/hooks'
import type { TemplateKind, WorkspaceItemRow } from '@/types/database'
import {
  applyChecklistTemplate,
  createFromSectionTemplate,
  deleteTemplate,
  fetchTemplates,
  saveChecklistAsTemplate,
  saveSectionAsTemplate,
} from './api'

function templatesKey(workspaceId: string | undefined, kind: TemplateKind) {
  return ['templates', workspaceId, kind] as const
}

export function useTemplates(kind: TemplateKind) {
  const { workspace } = useCurrentWorkspace()
  return useQuery({
    queryKey: templatesKey(workspace?.id, kind),
    queryFn: () => fetchTemplates(workspace!.id, kind),
    enabled: Boolean(workspace?.id),
  })
}

export function useDeleteTemplate(kind: TemplateKind) {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => deleteTemplate(templateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(workspace?.id, kind) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useSaveSectionAsTemplate() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, rootItem }: { name: string; rootItem: WorkspaceItemRow }) =>
      saveSectionAsTemplate(workspace!.id, name, rootItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKey(workspace?.id, 'section') })
      toast.success('Шаблон розділу збережено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCreateFromSectionTemplate() {
  const { workspace } = useCurrentWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      template,
      parentId,
      position,
    }: {
      template: Parameters<typeof createFromSectionTemplate>[0]
      parentId: string | null
      position: number
    }) => createFromSectionTemplate(template, workspace!.id, parentId, position, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceItems(workspace?.id) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useSaveChecklistAsTemplate() {
  const { workspace } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, items }: { name: string; items: string[] }) => saveChecklistAsTemplate(workspace!.id, name, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKey(workspace?.id, 'checklist') })
      toast.success('Шаблон чекліста збережено')
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useApplyChecklistTemplate(cardId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ template, existingCount }: { template: Parameters<typeof applyChecklistTemplate>[1]; existingCount: number }) =>
      applyChecklistTemplate(cardId, template, existingCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cardChecklist(cardId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanCards(boardId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
