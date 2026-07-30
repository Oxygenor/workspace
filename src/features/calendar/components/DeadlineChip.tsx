import { CircleDashed, ListChecks } from 'lucide-react'

import { cn } from '@/lib/utils'
import { PRIORITY_CLASSES } from '@/features/kanban/priority'
import type { DeadlineItem } from '../types'

interface DeadlineChipProps {
  deadline: DeadlineItem
  onClick: (deadline: DeadlineItem) => void
  className?: string
}

export function DeadlineChip({ deadline, onClick, className }: DeadlineChipProps) {
  const Icon = deadline.kind === 'card' ? CircleDashed : ListChecks

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(deadline)
      }}
      className={cn(
        'flex w-full items-center gap-1.5 truncate rounded border border-dashed px-1.5 py-0.5 text-left text-xs font-medium',
        PRIORITY_CLASSES[deadline.priority],
        className,
      )}
      title={deadline.title}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{deadline.title}</span>
    </button>
  )
}
