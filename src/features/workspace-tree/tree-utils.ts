import type { WorkspaceItemRow } from '@/types/database'

export { computeGapPosition, nextAppendPosition } from '@/lib/position'

export function buildChildrenMap(items: WorkspaceItemRow[]): Map<string | null, WorkspaceItemRow[]> {
  const map = new Map<string | null, WorkspaceItemRow[]>()
  for (const item of items) {
    const key = item.parent_id
    const bucket = map.get(key)
    if (bucket) {
      bucket.push(item)
    } else {
      map.set(key, [item])
    }
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.position - b.position)
  }
  return map
}

export function buildItemMap(items: WorkspaceItemRow[]): Map<string, WorkspaceItemRow> {
  return new Map(items.map((item) => [item.id, item]))
}

/** Returns true if `candidateAncestorId` is `nodeId` itself or one of its ancestors reached from `nodeId` upward. */
export function isDescendant(
  itemMap: Map<string, WorkspaceItemRow>,
  ancestorId: string,
  nodeId: string,
): boolean {
  let current = itemMap.get(nodeId)
  while (current) {
    if (current.id === ancestorId) return true
    if (!current.parent_id) return false
    current = itemMap.get(current.parent_id)
  }
  return false
}

export function getDescendantIds(childrenMap: Map<string | null, WorkspaceItemRow[]>, rootId: string): Set<string> {
  const result = new Set<string>()
  const stack = [...(childrenMap.get(rootId) ?? [])]
  while (stack.length > 0) {
    const node = stack.pop()!
    result.add(node.id)
    const children = childrenMap.get(node.id)
    if (children) stack.push(...children)
  }
  return result
}

export type MoveValidationResult =
  | { valid: true }
  | { valid: false; reason: 'self' | 'not-section' | 'descendant' }

/**
 * Validates a proposed workspace-item reparent before it's sent to the
 * server (the `move_workspace_item` RPC re-checks the same invariants —
 * this is the client-side fast path for instant feedback).
 */
export function validateMoveTarget(
  itemMap: Map<string, WorkspaceItemRow>,
  draggedId: string,
  newParentId: string | null,
): MoveValidationResult {
  if (newParentId === null) return { valid: true }
  if (newParentId === draggedId) return { valid: false, reason: 'self' }

  const targetParent = itemMap.get(newParentId)
  if (!targetParent || targetParent.type !== 'section') {
    return { valid: false, reason: 'not-section' }
  }

  if (isDescendant(itemMap, draggedId, newParentId)) {
    return { valid: false, reason: 'descendant' }
  }

  return { valid: true }
}
