import { PRIORITY_ORDER } from './priority'
import type { KanbanCardSummary, KanbanFilters } from './types'
import type { KanbanSortMode } from '@/stores/kanban-filters-store'

export function applyCardFilters(
  cards: KanbanCardSummary[],
  filters: KanbanFilters,
  search: string,
): KanbanCardSummary[] {
  const query = search.trim().toLowerCase()

  return cards.filter((card) => {
    if (query) {
      const matches =
        card.title.toLowerCase().includes(query) ||
        String(card.card_number).includes(query) ||
        (card.description ?? '').toLowerCase().includes(query)
      if (!matches) return false
    }

    if (filters.assigneeId && !card.assigneeIds.includes(filters.assigneeId)) return false
    if (filters.priority && card.priority !== filters.priority) return false
    if (filters.labelId && !card.labelIds.includes(filters.labelId)) return false

    if (filters.dueFilter === 'no-due-date' && card.due_date) return false
    if (filters.dueFilter === 'overdue') {
      if (!card.due_date || new Date(card.due_date).getTime() >= Date.now()) return false
    }
    if (filters.dueFilter === 'completed') {
      if (card.checklistTotal === 0 || card.checklistCompleted < card.checklistTotal) return false
    }

    return true
  })
}

export function sortCards(cards: KanbanCardSummary[], mode: KanbanSortMode): KanbanCardSummary[] {
  const copy = [...cards]
  switch (mode) {
    case 'due':
      return copy.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })
    case 'priority':
      return copy.sort((a, b) => PRIORITY_ORDER.indexOf(b.priority) - PRIORITY_ORDER.indexOf(a.priority))
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title, 'uk'))
    default:
      return copy.sort((a, b) => a.position - b.position)
  }
}
