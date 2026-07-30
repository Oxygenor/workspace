import { describe, expect, it } from 'vitest'

import { EMPTY_FILTERS, type KanbanCardSummary } from './types'
import { applyCardFilters, sortCards } from './filter-utils'

function makeCard(overrides: Partial<KanbanCardSummary> & { id: string }): KanbanCardSummary {
  return {
    board_id: 'board-1',
    column_id: 'col-1',
    card_number: 1,
    title: 'Картка',
    description: null,
    priority: 'medium',
    color: null,
    start_date: null,
    due_date: null,
    position: 1000,
    created_by: 'user-1',
    archived_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    labelIds: [],
    tagIds: [],
    checklistTotal: 0,
    checklistCompleted: 0,
    commentsCount: 0,
    attachmentsCount: 0,
    ...overrides,
  }
}

describe('applyCardFilters', () => {
  const cards = [
    makeCard({ id: '1', title: 'Виправити баг у логіні', priority: 'high' }),
    makeCard({ id: '2', title: 'Оновити дизайн', priority: 'low' }),
    makeCard({ id: '3', title: 'Написати тести', due_date: '2020-01-01T00:00:00.000Z' }),
  ]

  it('filters by free-text search across title', () => {
    const result = applyCardFilters(cards, EMPTY_FILTERS, 'дизайн')
    expect(result.map((c) => c.id)).toEqual(['2'])
  })

  it('filters by priority', () => {
    const result = applyCardFilters(cards, { ...EMPTY_FILTERS, priority: 'high' }, '')
    expect(result.map((c) => c.id)).toEqual(['1'])
  })

  it('filters overdue cards (due date in the past)', () => {
    const result = applyCardFilters(cards, { ...EMPTY_FILTERS, dueFilter: 'overdue' }, '')
    expect(result.map((c) => c.id)).toEqual(['3'])
  })

  it('filters cards with no due date', () => {
    const result = applyCardFilters(cards, { ...EMPTY_FILTERS, dueFilter: 'no-due-date' }, '')
    expect(result.map((c) => c.id).sort()).toEqual(['1', '2'])
  })
})

describe('sortCards', () => {
  it('sorts by manual position by default', () => {
    const cards = [makeCard({ id: 'b', position: 2000 }), makeCard({ id: 'a', position: 1000 })]
    expect(sortCards(cards, 'manual').map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('sorts by title alphabetically', () => {
    const cards = [makeCard({ id: '1', title: 'Б' }), makeCard({ id: '2', title: 'А' })]
    expect(sortCards(cards, 'title').map((c) => c.id)).toEqual(['2', '1'])
  })

  it('sorts by priority, highest first', () => {
    const cards = [makeCard({ id: 'low', priority: 'low' }), makeCard({ id: 'critical', priority: 'critical' })]
    expect(sortCards(cards, 'priority').map((c) => c.id)).toEqual(['critical', 'low'])
  })
})
