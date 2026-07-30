import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import type { TableColumnRow, TableFieldType, TableRowRow } from '@/types/database'
import {
  createColumn,
  createRow,
  deleteColumn,
  deleteRow,
  fetchCells,
  fetchColumns,
  fetchRows,
  renameColumn,
  reorderColumn,
  reorderRow,
  updateColumnSettings,
  updateColumnType,
  upsertCell,
} from './api'

export function useTableColumns(tableId: string) {
  return useQuery({ queryKey: queryKeys.tableColumns(tableId), queryFn: () => fetchColumns(tableId) })
}

export function useTableRows(tableId: string) {
  return useQuery({ queryKey: queryKeys.tableRows(tableId), queryFn: () => fetchRows(tableId) })
}

export function useTableCells(tableId: string) {
  return useQuery({ queryKey: queryKeys.tableCells(tableId), queryFn: () => fetchCells(tableId) })
}

export function useCreateColumn(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, fieldType, position }: { name: string; fieldType: TableFieldType; position: number }) =>
      createColumn(tableId, name, fieldType, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableColumns(tableId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useRenameColumn(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, name }: { columnId: string; name: string }) => renameColumn(columnId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableColumns(tableId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateColumnType(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, fieldType }: { columnId: string; fieldType: TableFieldType }) =>
      updateColumnType(columnId, fieldType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableColumns(tableId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateColumnSettings(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, settings }: { columnId: string; settings: Record<string, unknown> }) =>
      updateColumnSettings(columnId, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableColumns(tableId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useReorderColumn(tableId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.tableColumns(tableId)
  return useMutation({
    mutationFn: ({ columnId, position }: { columnId: string; position: number }) => reorderColumn(columnId, position),
    onMutate: async ({ columnId, position }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TableColumnRow[]>(key)
      queryClient.setQueryData<TableColumnRow[]>(key, (old) =>
        old
          ? old.map((c) => (c.id === columnId ? { ...c, position } : c)).sort((a, b) => a.position - b.position)
          : old,
      )
      return { previous }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useDeleteColumn(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (columnId: string) => deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tableColumns(tableId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tableCells(tableId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useCreateRow(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (position: number) => createRow(tableId, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableRows(tableId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useReorderRow(tableId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.tableRows(tableId)
  return useMutation({
    mutationFn: ({ rowId, position }: { rowId: string; position: number }) => reorderRow(rowId, position),
    onMutate: async ({ rowId, position }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TableRowRow[]>(key)
      queryClient.setQueryData<TableRowRow[]>(key, (old) =>
        old ? old.map((r) => (r.id === rowId ? { ...r, position } : r)).sort((a, b) => a.position - b.position) : old,
      )
      return { previous }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useDeleteRow(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rowId: string) => deleteRow(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tableRows(tableId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tableCells(tableId) })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpsertCell(tableId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rowId, columnId, value }: { rowId: string; columnId: string; value: unknown }) =>
      upsertCell(rowId, columnId, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tableCells(tableId) }),
    onError: (error: Error) => toast.error(error.message),
  })
}
