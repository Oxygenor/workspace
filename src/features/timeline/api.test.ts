import { describe, expect, it, vi } from 'vitest'

import { createSupabaseMock } from '@/test/supabase-mock'
import type { WorkspaceItemRow } from '@/types/database'

const { supabase, queueResult, calls } = createSupabaseMock()

vi.mock('@/lib/supabase/client', () => ({ supabase }))

const { fetchTimelineEntries } = await import('./api')

function makeItem(overrides: Partial<WorkspaceItemRow> & { id: string; type: WorkspaceItemRow['type'] }): WorkspaceItemRow {
  return {
    workspace_id: 'workspace-1',
    parent_id: 'section-1',
    name: 'Item',
    icon: null,
    color: '#000000',
    position: 1000,
    settings: {},
    created_by: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('fetchTimelineEntries', () => {
  it('merges kanban cards and tasks from direct kanban/task_list children into a unified shape', async () => {
    const childItems = [
      makeItem({ id: 'board-1', type: 'kanban' }),
      makeItem({ id: 'list-1', type: 'task_list' }),
      makeItem({ id: 'notes-1', type: 'notes' }),
    ]

    queueResult('kanban_cards', {
      data: [
        {
          id: 'card-1',
          board_id: 'board-1',
          title: 'Картка з датою початку',
          priority: 'high',
          start_date: '2026-02-01T00:00:00.000Z',
          due_date: '2026-02-05T00:00:00.000Z',
        },
      ],
      error: null,
    })
    queueResult('tasks', {
      data: [
        {
          id: 'task-1',
          task_list_id: 'list-1',
          title: 'Завдання без дати початку',
          priority: 'medium',
          start_date: null,
          due_date: '2026-02-10T00:00:00.000Z',
          completed: false,
        },
      ],
      error: null,
    })

    const entries = await fetchTimelineEntries(childItems)

    expect(entries).toHaveLength(2)

    const cardEntry = entries.find((e) => e.sourceType === 'card')!
    expect(cardEntry.targetItemId).toBe('board-1')
    expect(cardEntry.start.toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(cardEntry.end.toISOString()).toBe('2026-02-05T00:00:00.000Z')

    // start_date is null on the task, so start falls back to due_date (single-day marker).
    const taskEntry = entries.find((e) => e.sourceType === 'task')!
    expect(taskEntry.targetItemId).toBe('list-1')
    expect(taskEntry.start.getTime()).toBe(taskEntry.end.getTime())
  })

  it('skips querying a table entirely when there are no children of that type', async () => {
    const childItems = [makeItem({ id: 'notes-1', type: 'notes' }), makeItem({ id: 'table-1', type: 'table' })]
    const callsBefore = calls.length

    const entries = await fetchTimelineEntries(childItems)

    expect(entries).toEqual([])
    const newCalls = calls.slice(callsBefore)
    expect(newCalls.some((c) => c.table === 'kanban_cards')).toBe(false)
    expect(newCalls.some((c) => c.table === 'tasks')).toBe(false)
  })
})
