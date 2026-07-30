import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { TableCellRow, TableColumnRow, TableFieldType, TableRowRow } from '@/types/database'

export async function fetchColumns(tableId: string): Promise<TableColumnRow[]> {
  const result = await supabase
    .from('table_columns')
    .select('*')
    .eq('table_id', tableId)
    .order('position', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити колонки.')
}

export async function fetchRows(tableId: string): Promise<TableRowRow[]> {
  const result = await supabase
    .from('table_rows')
    .select('*')
    .eq('table_id', tableId)
    .order('position', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити рядки.')
}

export async function fetchCells(tableId: string): Promise<TableCellRow[]> {
  const rowsResult = await supabase.from('table_rows').select('id').eq('table_id', tableId)
  const rows = throwIfError(rowsResult, 'Не вдалося завантажити рядки.')

  if (rows.length === 0) return []

  const rowIds = rows.map((row) => row.id)
  const cellsResult = await supabase.from('table_cells').select('*').in('row_id', rowIds)
  return throwIfError(cellsResult, 'Не вдалося завантажити значення таблиці.')
}

export async function createColumn(
  tableId: string,
  name: string,
  fieldType: TableFieldType,
  position: number,
): Promise<TableColumnRow> {
  const result = await supabase
    .from('table_columns')
    .insert({ table_id: tableId, name, field_type: fieldType, position })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося створити колонку.')
}

export async function renameColumn(columnId: string, name: string): Promise<TableColumnRow> {
  const result = await supabase.from('table_columns').update({ name }).eq('id', columnId).select('*').single()
  return throwIfError(result, 'Не вдалося перейменувати колонку.')
}

export async function updateColumnType(columnId: string, fieldType: TableFieldType): Promise<TableColumnRow> {
  const result = await supabase
    .from('table_columns')
    .update({ field_type: fieldType })
    .eq('id', columnId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося змінити тип колонки.')
}

export async function updateColumnSettings(
  columnId: string,
  settings: Record<string, unknown>,
): Promise<TableColumnRow> {
  const result = await supabase
    .from('table_columns')
    .update({ settings })
    .eq('id', columnId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося змінити налаштування колонки.')
}

export async function reorderColumn(columnId: string, position: number): Promise<void> {
  const { error } = await supabase.from('table_columns').update({ position }).eq('id', columnId)
  if (error) throw toAppError(error, 'Не вдалося змінити порядок колонок.')
}

export async function deleteColumn(columnId: string): Promise<void> {
  const { error } = await supabase.from('table_columns').delete().eq('id', columnId)
  if (error) throw toAppError(error, 'Не вдалося видалити колонку.')
}

export async function createRow(tableId: string, position: number): Promise<TableRowRow> {
  const result = await supabase
    .from('table_rows')
    .insert({ table_id: tableId, position })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося створити рядок.')
}

export async function reorderRow(rowId: string, position: number): Promise<void> {
  const { error } = await supabase.from('table_rows').update({ position }).eq('id', rowId)
  if (error) throw toAppError(error, 'Не вдалося змінити порядок рядків.')
}

export async function deleteRow(rowId: string): Promise<void> {
  const { error } = await supabase.from('table_rows').delete().eq('id', rowId)
  if (error) throw toAppError(error, 'Не вдалося видалити рядок.')
}

export async function upsertCell(rowId: string, columnId: string, value: unknown): Promise<TableCellRow> {
  const result = await supabase
    .from('table_cells')
    .upsert({ row_id: rowId, column_id: columnId, value }, { onConflict: 'row_id,column_id' })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося зберегти значення.')
}
