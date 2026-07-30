import { describe, expect, it } from 'vitest'

import type { WorkspaceItemRow } from '@/types/database'
import { buildChildrenMap, buildItemMap, isDescendant, validateMoveTarget } from './tree-utils'

function makeItem(overrides: Partial<WorkspaceItemRow> & { id: string }): WorkspaceItemRow {
  return {
    workspace_id: 'ws-1',
    parent_id: null,
    type: 'section',
    name: overrides.id,
    icon: null,
    position: 1000,
    settings: {},
    created_by: 'user-1',
    archived_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// Tree shape used across tests:
// root (section)
//   └── child (section)
//         └── grandchild (section)
// board (kanban) — a sibling of root, not a section
const root = makeItem({ id: 'root', parent_id: null })
const child = makeItem({ id: 'child', parent_id: 'root' })
const grandchild = makeItem({ id: 'grandchild', parent_id: 'child' })
const board = makeItem({ id: 'board', parent_id: null, type: 'kanban' })

const items = [root, child, grandchild, board]
const itemMap = buildItemMap(items)

describe('buildChildrenMap', () => {
  it('groups items by parent_id and sorts by position', () => {
    const map = buildChildrenMap([
      makeItem({ id: 'b', parent_id: 'root', position: 2000 }),
      makeItem({ id: 'a', parent_id: 'root', position: 1000 }),
    ])
    expect(map.get('root')?.map((i) => i.id)).toEqual(['a', 'b'])
  })
})

describe('isDescendant', () => {
  it('returns true when walking up from the node reaches the ancestor', () => {
    expect(isDescendant(itemMap, 'root', 'grandchild')).toBe(true)
  })

  it('returns false for unrelated branches', () => {
    expect(isDescendant(itemMap, 'board', 'grandchild')).toBe(false)
  })
})

describe('validateMoveTarget — section nesting rules', () => {
  it('allows moving an item to the workspace root (null parent)', () => {
    expect(validateMoveTarget(itemMap, 'grandchild', null)).toEqual({ valid: true })
  })

  it('rejects moving a section into itself', () => {
    expect(validateMoveTarget(itemMap, 'root', 'root')).toEqual({ valid: false, reason: 'self' })
  })

  it('rejects moving a parent section into its own descendant', () => {
    // "root" contains "child" contains "grandchild" — dropping root onto
    // grandchild would create a cycle and must be rejected.
    expect(validateMoveTarget(itemMap, 'root', 'grandchild')).toEqual({ valid: false, reason: 'descendant' })
  })

  it('rejects nesting anything under a non-section item (e.g. a kanban board)', () => {
    expect(validateMoveTarget(itemMap, 'child', 'board')).toEqual({ valid: false, reason: 'not-section' })
  })

  it('allows moving an item into an unrelated section', () => {
    expect(validateMoveTarget(itemMap, 'grandchild', 'root')).toEqual({ valid: true })
  })
})
