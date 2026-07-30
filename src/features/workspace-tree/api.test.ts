import { describe, expect, it, vi } from 'vitest'

import { createSupabaseMock } from '@/test/supabase-mock'

const { supabase, queueResult } = createSupabaseMock()

vi.mock('@/lib/supabase/client', () => ({ supabase }))

const { createWorkspaceItem } = await import('./api')

describe('createWorkspaceItem', () => {
  it('creates a root-level section', async () => {
    queueResult('workspace_items', {
      data: {
        id: 'item-1',
        workspace_id: 'ws-1',
        parent_id: null,
        type: 'section',
        name: 'Розробка ігор',
        icon: 'Folder',
        position: 1000,
        settings: {},
        created_by: 'user-1',
        archived_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })

    const item = await createWorkspaceItem({
      workspaceId: 'ws-1',
      parentId: null,
      type: 'section',
      name: 'Розробка ігор',
      position: 1000,
      createdBy: 'user-1',
    })

    expect(item.id).toBe('item-1')
    expect(item.parent_id).toBeNull()
    expect(item.type).toBe('section')
  })

  it('creates a nested section under an existing parent', async () => {
    queueResult('workspace_items', {
      data: {
        id: 'item-2',
        workspace_id: 'ws-1',
        parent_id: 'item-1',
        type: 'section',
        name: 'Проєкти',
        icon: 'Folder',
        position: 1000,
        settings: {},
        created_by: 'user-1',
        archived_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })

    const item = await createWorkspaceItem({
      workspaceId: 'ws-1',
      parentId: 'item-1',
      type: 'section',
      name: 'Проєкти',
      position: 1000,
      createdBy: 'user-1',
    })

    expect(item.parent_id).toBe('item-1')
    expect(item.name).toBe('Проєкти')
  })

  it('creates a kanban board and its default columns', async () => {
    queueResult('workspace_items', {
      data: {
        id: 'board-1',
        workspace_id: 'ws-1',
        parent_id: 'item-1',
        type: 'kanban',
        name: 'Канбан розробки',
        icon: 'KanbanSquare',
        position: 1000,
        settings: {},
        created_by: 'user-1',
        archived_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })
    queueResult('kanban_columns', { data: null, error: null })

    const item = await createWorkspaceItem({
      workspaceId: 'ws-1',
      parentId: 'item-1',
      type: 'kanban',
      name: 'Канбан розробки',
      position: 1000,
      createdBy: 'user-1',
    })

    expect(item.type).toBe('kanban')
    expect(supabase.from).toHaveBeenCalledWith('kanban_columns')
  })
})
