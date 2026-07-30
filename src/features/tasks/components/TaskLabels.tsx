import { useState } from 'react'
import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'
import type { TaskRow } from '@/types/database'
import { useUpdateTask } from '../hooks'

interface TaskLabelsProps {
  task: TaskRow
  taskListId: string
}

export function TaskLabels({ task, taskListId }: TaskLabelsProps) {
  const updateTask = useUpdateTask(taskListId)
  const [draft, setDraft] = useState('')

  function addLabel() {
    const trimmed = draft.trim()
    setDraft('')
    if (!trimmed || task.labels.includes(trimmed)) return
    updateTask.mutate({ taskId: task.id, input: { labels: [...task.labels, trimmed] } })
  }

  function removeLabel(label: string) {
    updateTask.mutate({ taskId: task.id, input: { labels: task.labels.filter((l) => l !== label) } })
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {task.labels.map((label) => (
        <Badge key={label} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
          {label}
          <button
            type="button"
            onClick={() => removeLabel(label)}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.tasks.addLabel}
        className="h-5 w-24 min-w-0 border-none bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addLabel()
          }
        }}
      />
    </div>
  )
}
