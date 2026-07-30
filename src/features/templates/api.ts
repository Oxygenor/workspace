import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import { createWorkspaceItem } from '@/features/workspace-tree/api'
import type { TemplateKind, TemplateRow, WorkspaceItemRow } from '@/types/database'
import type { ChecklistTemplatePayload, SectionTemplateNode, SectionTemplatePayload } from './types'

export async function fetchTemplates(workspaceId: string, kind: TemplateKind): Promise<TemplateRow[]> {
  const result = await supabase
    .from('templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('kind', kind)
    .order('name', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити шаблони.')
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from('templates').delete().eq('id', templateId)
  if (error) throw toAppError(error, 'Не вдалося видалити шаблон.')
}

async function snapshotSectionTree(item: WorkspaceItemRow): Promise<SectionTemplateNode> {
  const node: SectionTemplateNode = {
    type: item.type,
    name: item.name,
    icon: item.icon,
    color: item.color,
  }

  if (item.type !== 'section') {
    return node
  }

  const { data: children, error } = await supabase
    .from('workspace_items')
    .select('*')
    .eq('parent_id', item.id)
    .is('archived_at', null)
    .order('position', { ascending: true })
  if (error) throw toAppError(error, 'Не вдалося прочитати вміст розділу для шаблону.')

  if (children && children.length > 0) {
    node.children = await Promise.all(children.map((child) => snapshotSectionTree(child)))
  }

  return node
}

export async function saveSectionAsTemplate(
  workspaceId: string,
  name: string,
  rootItem: WorkspaceItemRow,
): Promise<TemplateRow> {
  const tree = await snapshotSectionTree(rootItem)
  const payload: SectionTemplatePayload = { tree }

  const result = await supabase
    .from('templates')
    .insert({ workspace_id: workspaceId, kind: 'section', name, payload })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося зберегти шаблон розділу.')
}

async function instantiateNode(
  node: SectionTemplateNode,
  workspaceId: string,
  parentId: string | null,
  position: number,
  createdBy: string,
): Promise<WorkspaceItemRow> {
  const created = await createWorkspaceItem({
    workspaceId,
    parentId,
    type: node.type,
    name: node.name,
    position,
    createdBy,
  })

  const patch: { icon?: string; color?: string } = {}
  if (node.icon) patch.icon = node.icon
  if (node.color) patch.color = node.color
  if (Object.keys(patch).length > 0) {
    await supabase.from('workspace_items').update(patch).eq('id', created.id)
  }

  if (node.children && node.children.length > 0) {
    let childPosition = 1000
    for (const child of node.children) {
      await instantiateNode(child, workspaceId, created.id, childPosition, createdBy)
      childPosition += 1000
    }
  }

  return created
}

export async function createFromSectionTemplate(
  template: TemplateRow,
  workspaceId: string,
  parentId: string | null,
  position: number,
  createdBy: string,
): Promise<WorkspaceItemRow> {
  const payload = template.payload as unknown as SectionTemplatePayload
  return instantiateNode(payload.tree, workspaceId, parentId, position, createdBy)
}

export async function saveChecklistAsTemplate(
  workspaceId: string,
  name: string,
  items: string[],
): Promise<TemplateRow> {
  const payload: ChecklistTemplatePayload = { items }
  const result = await supabase
    .from('templates')
    .insert({ workspace_id: workspaceId, kind: 'checklist', name, payload })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося зберегти шаблон чекліста.')
}

export async function applyChecklistTemplate(
  cardId: string,
  template: TemplateRow,
  existingCount: number,
): Promise<void> {
  const payload = template.payload as unknown as ChecklistTemplatePayload
  if (!payload.items || payload.items.length === 0) return

  const basePosition = (existingCount + 1) * 1000
  const rows = payload.items.map((title, index) => ({
    card_id: cardId,
    title,
    position: basePosition + index * 1000,
  }))

  const { error } = await supabase.from('checklist_items').insert(rows)
  if (error) throw toAppError(error, 'Не вдалося застосувати шаблон чекліста.')
}
