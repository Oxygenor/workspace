import { describe, expect, it, vi } from 'vitest'

import { createSupabaseMock } from '@/test/supabase-mock'

const { supabase, queueResult, queueRpcResult } = createSupabaseMock()

vi.mock('@/lib/supabase/client', () => ({ supabase }))

const { moveCard, createColumn } = await import('./api')

describe('moveCard', () => {
  it('calls the move_kanban_card RPC with the card, target column and position', async () => {
    queueRpcResult({ data: null, error: null })

    await moveCard('card-1', 'col-2', 1500)

    expect(supabase.rpc).toHaveBeenCalledWith('move_kanban_card', {
      p_card_id: 'card-1',
      p_new_column_id: 'col-2',
      p_new_position: 1500,
    })
  })

  it('throws a friendly error when the RPC rejects the move', async () => {
    queueRpcResult({ data: null, error: { message: 'target column must belong to the same board', code: 'P0001' } })

    await expect(moveCard('card-1', 'col-from-other-board', 1500)).rejects.toThrow()
  })
})

describe('createColumn', () => {
  it('inserts a new column for the given board', async () => {
    queueResult('kanban_columns', {
      data: {
        id: 'col-1',
        board_id: 'board-1',
        name: 'Нові',
        color: '#a855f7',
        position: 1000,
        archived_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    })

    const column = await createColumn('board-1', 'Нові', 1000)

    expect(column.board_id).toBe('board-1')
    expect(column.name).toBe('Нові')
  })
})
