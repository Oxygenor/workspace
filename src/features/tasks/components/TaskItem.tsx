import { useState } from 'react'
import { AlarmClock, Clock, Inbox, Plus, Repeat, Trash2, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PRIORITY_CLASSES, PRIORITY_LABELS, PRIORITY_ORDER } from '@/features/kanban/priority'
import { TagPicker } from '@/features/tags/components/TagPicker'
import { TimeTrackingSection } from '@/features/time/components/TimeTrackingSection'
import { formatDuration, useRunningTimer, useTotalSecondsForTarget } from '@/features/time/hooks'
import { cn, openDatePicker } from '@/lib/utils'
import { nextAppendPosition } from '@/lib/position'
import { formatDateKey } from '@/lib/parse-date-phrase'
import { t } from '@/i18n'
import type { PriorityLevel, TaskRecurrence, TaskRow } from '@/types/database'
import { useCreateTask, useDeleteTask, useUpdateTask } from '../hooks'
import { nextOccurrenceDate } from '../recurrence'
import { AddTaskInput } from './AddTaskInput'
import { TaskCustomFields } from './TaskCustomFields'
import { TaskDependencies } from './TaskDependencies'
import { TaskLabels } from './TaskLabels'

const NONE_RECURRENCE = '__none__'

function isTaskSnoozed(task: TaskRow): boolean {
  return Boolean(task.snoozed_until && new Date(task.snoozed_until).getTime() > Date.now())
}

function TaskRecurrenceSelect({ task, taskListId }: { task: TaskRow; taskListId: string }) {
  const updateTask = useUpdateTask(taskListId)

  return (
    <Select
      value={task.recurrence ?? NONE_RECURRENCE}
      onValueChange={(value) =>
        updateTask.mutate({
          taskId: task.id,
          input: { recurrence: value === NONE_RECURRENCE ? null : (value as TaskRecurrence) },
        })
      }
    >
      <SelectTrigger
        className={cn(
          'h-6 w-auto shrink-0 gap-1 rounded-full border-none px-2 text-xs font-medium shadow-none text-muted-foreground',
          task.recurrence && 'text-primary',
        )}
        title={t.recurrence.label}
      >
        <Repeat className="h-3 w-3" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_RECURRENCE}>{t.recurrence.none}</SelectItem>
        <SelectItem value="daily">{t.recurrence.daily}</SelectItem>
        <SelectItem value="weekly">{t.recurrence.weekly}</SelectItem>
        <SelectItem value="monthly">{t.recurrence.monthly}</SelectItem>
      </SelectContent>
    </Select>
  )
}

function TaskSnoozeControl({ task, taskListId }: { task: TaskRow; taskListId: string }) {
  const updateTask = useUpdateTask(taskListId)
  const snoozed = isTaskSnoozed(task)

  function snoozeFor(days: number) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(9, 0, 0, 0)
    updateTask.mutate({ taskId: task.id, input: { snoozed_until: date.toISOString() } })
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {snoozed && (
        <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
          {t.snooze.snoozedUntil} {new Date(task.snoozed_until!).toLocaleDateString('uk-UA')}
          <button
            type="button"
            onClick={() => updateTask.mutate({ taskId: task.id, input: { snoozed_until: null } })}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            title={t.snooze.clear}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6 shrink-0', snoozed ? 'text-primary' : 'opacity-0 group-hover:opacity-100')}
            title={t.snooze.action}
          >
            <AlarmClock className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 space-y-1 p-1" align="start">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => snoozeFor(1)}>
            {t.snooze.tomorrow}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => snoozeFor(7)}>
            {t.snooze.nextWeek}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function TaskTimeButton({ taskId, title }: { taskId: string; title: string }) {
  const { data: runningEntry } = useRunningTimer()
  const { data: totalSeconds } = useTotalSecondsForTarget({ taskId })
  const isRunning = runningEntry?.task_id === taskId

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-6 shrink-0 gap-1 px-1.5 text-xs', isRunning && 'text-primary')}
        >
          <Clock className={cn('h-3.5 w-3.5', isRunning && 'animate-pulse')} />
          {formatDuration(totalSeconds ?? 0)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <TimeTrackingSection taskId={taskId} title={title} />
      </PopoverContent>
    </Popover>
  )
}

interface TaskItemProps {
  task: TaskRow
  taskListId: string
  subtasks?: TaskRow[]
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (taskId: string) => void
}

export function TaskItem({
  task,
  taskListId,
  subtasks = [],
  selectMode = false,
  selected = false,
  onToggleSelect,
}: TaskItemProps) {
  const isSubtask = task.parent_task_id !== null

  const updateTask = useUpdateTask(taskListId)
  const deleteTask = useDeleteTask(taskListId)
  const createTask = useCreateTask(taskListId)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  function commitTitle() {
    const trimmed = draftTitle.trim()
    setIsEditingTitle(false)
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ taskId: task.id, input: { title: trimmed } })
    } else {
      setDraftTitle(task.title)
    }
  }

  function handleAddSubtask(title: string, dueDate?: string | null) {
    createTask.mutate({ title, position: nextAppendPosition(subtasks), parentTaskId: task.id, dueDate })
    setIsAddingSubtask(false)
  }

  function handleToggleCompleted(checked: boolean) {
    if (checked && task.recurrence) {
      const next = nextOccurrenceDate(task.recurrence, task.due_date)
      updateTask.mutate({
        taskId: task.id,
        input: { completed: false, due_date: formatDateKey(next) },
      })
      return
    }
    updateTask.mutate({ taskId: task.id, input: { completed: checked } })
  }

  const snoozed = isTaskSnoozed(task)

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'group flex flex-wrap items-center gap-2 rounded-md px-1 py-1.5 hover:bg-accent/50',
          snoozed && 'opacity-50',
        )}
      >
        {!isSubtask && selectMode && (
          <Checkbox checked={selected} onCheckedChange={() => onToggleSelect?.(task.id)} />
        )}

        <Checkbox
          checked={task.completed}
          onCheckedChange={(checked) => handleToggleCompleted(checked === true)}
        />

        {isEditingTitle ? (
          <Input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') {
                setDraftTitle(task.title)
                setIsEditingTitle(false)
              }
            }}
            className="h-7 min-w-40 flex-1"
          />
        ) : (
          <button
            type="button"
            className={cn(
              'min-w-40 flex-1 truncate text-left text-sm',
              task.completed && 'text-muted-foreground line-through',
            )}
            onClick={() => {
              setDraftTitle(task.title)
              setIsEditingTitle(true)
            }}
          >
            {task.title}
          </button>
        )}

        <Select
          value={task.priority}
          onValueChange={(value) => updateTask.mutate({ taskId: task.id, input: { priority: value as PriorityLevel } })}
        >
          <SelectTrigger
            className={cn(
              'h-6 w-auto shrink-0 gap-1 rounded-full border-none px-2 text-xs font-medium shadow-none',
              PRIORITY_CLASSES[task.priority],
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_ORDER.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="date"
          value={task.due_date?.slice(0, 10) ?? ''}
          onClick={openDatePicker}
          onChange={(e) =>
            updateTask.mutate({ taskId: task.id, input: { due_date: e.target.value ? e.target.value : null } })
          }
          className="h-7 shrink-0 rounded-md border border-input bg-transparent px-1.5 text-xs text-muted-foreground shadow-sm"
        />

        <TaskRecurrenceSelect task={task} taskListId={taskListId} />

        <TaskLabels task={task} taskListId={taskListId} />

        <TagPicker taskId={task.id} />

        <TaskTimeButton taskId={task.id} title={task.title} />

        <TaskDependencies task={task} taskListId={taskListId} />

        <TaskSnoozeControl task={task} taskListId={taskListId} />

        <TaskCustomFields taskId={task.id} taskListId={taskListId} />

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 shrink-0',
            task.is_someday ? 'text-primary' : 'opacity-0 group-hover:opacity-100',
          )}
          title={task.is_someday ? t.tasks.unmarkSomeday : t.tasks.markSomeday}
          onClick={() =>
            updateTask.mutate({ taskId: task.id, input: { is_someday: !task.is_someday } })
          }
        >
          <Inbox className="h-3.5 w-3.5" />
        </Button>

        {!isSubtask && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
            title={t.tasks.addSubtask}
            onClick={() => setIsAddingSubtask((prev) => !prev)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!isSubtask && isAddingSubtask && (
        <div className="ml-6">
          <AddTaskInput
            placeholder={t.tasks.addSubtask}
            autoFocus
            onSubmit={handleAddSubtask}
            onCancel={() => setIsAddingSubtask(false)}
          />
        </div>
      )}

      {!isSubtask && subtasks.length > 0 && (
        <div className="ml-6 space-y-1 border-l border-border pl-3">
          {subtasks.map((subtask) => (
            <TaskItem key={subtask.id} task={subtask} taskListId={taskListId} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.tasks.deleteTaskTitle}
        description={t.tasks.deleteTaskDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteTask.mutate(task.id)}
      />
    </div>
  )
}
