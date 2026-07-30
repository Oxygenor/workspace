import { useMemo } from 'react'
import { Link2, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'
import type { TaskRow } from '@/types/database'
import { useAddDependency, useDependencies, useRemoveDependency, useTasks } from '../hooks'

interface TaskDependenciesProps {
  task: TaskRow
  taskListId: string
}

export function TaskDependencies({ task, taskListId }: TaskDependenciesProps) {
  const { data: allTasks = [] } = useTasks(taskListId)
  const { data: dependencies = [] } = useDependencies(taskListId)
  const addDependency = useAddDependency(taskListId)
  const removeDependency = useRemoveDependency(taskListId)

  const myDependencyIds = useMemo(
    () => new Set(dependencies.filter((dep) => dep.task_id === task.id).map((dep) => dep.depends_on_task_id)),
    [dependencies, task.id],
  )

  const blockedBy = useMemo(
    () => allTasks.filter((candidate) => myDependencyIds.has(candidate.id) && !candidate.completed),
    [allTasks, myDependencyIds],
  )

  const candidates = useMemo(
    () => allTasks.filter((candidate) => candidate.parent_task_id === null && candidate.id !== task.id),
    [allTasks, task.id],
  )

  function toggleDependency(dependsOnTaskId: string, checked: boolean) {
    if (checked) {
      addDependency.mutate({ taskId: task.id, dependsOnTaskId })
    } else {
      removeDependency.mutate({ taskId: task.id, dependsOnTaskId })
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {blockedBy.length > 0 && (
        <span
          className="flex h-6 items-center gap-1 rounded-full bg-amber-500/15 px-1.5 text-xs text-amber-700 dark:text-amber-400"
          title={`${t.tasks.blockedByPrefix}: ${blockedBy.map((b) => b.title).join(', ')}`}
        >
          <Lock className="h-3 w-3" />
          {t.tasks.blocked}
        </span>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0',
              myDependencyIds.size === 0 && 'opacity-0 group-hover:opacity-100',
            )}
            title={t.tasks.dependencies}
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t.tasks.dependenciesPickerTitle}</p>
          {candidates.length === 0 && (
            <p className="text-xs text-muted-foreground">{t.tasks.noOtherTasksForDependency}</p>
          )}
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {candidates.map((candidate) => (
              <label
                key={candidate.id}
                className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent/50"
              >
                <Checkbox
                  checked={myDependencyIds.has(candidate.id)}
                  onCheckedChange={(checked) => toggleDependency(candidate.id, checked === true)}
                />
                <span className="truncate">{candidate.title}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
