import { useMemo, useState } from 'react'
import { ListChecks } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { nextAppendPosition } from '@/lib/position'
import type { ModuleComponentProps } from '@/lib/modules/registry'
import { t } from '@/i18n'
import type { TaskRow } from '@/types/database'
import { AddTaskInput } from '../components/AddTaskInput'
import { TaskFieldsManager } from '../components/TaskFieldsManager'
import { TaskItem } from '../components/TaskItem'
import { useBulkDeleteTasks, useBulkUpdateTasks, useCreateTask, useTasks } from '../hooks'

type Mode = 'all' | 'active' | 'completed' | 'overdue' | 'today' | 'thisWeek' | 'someday'

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Monday-based start-of-week date key for the given date. */
function weekStartKey(date: Date): string {
  const start = new Date(date)
  const day = start.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diffToMonday)
  return toDateKey(start)
}

/** Sunday-based end-of-week date key for the given date. */
function weekEndKey(date: Date): string {
  const end = new Date(date)
  const day = end.getDay()
  const diffToSunday = day === 0 ? 0 : 7 - day
  end.setDate(end.getDate() + diffToSunday)
  return toDateKey(end)
}

function matchesMode(task: TaskRow, mode: Mode, todayKey: string, weekStart: string, weekEnd: string): boolean {
  if (mode === 'all') return true
  if (mode === 'someday') return task.is_someday
  if (mode === 'completed') return task.completed
  // "Someday/maybe" tasks are intentionally parked and shouldn't clutter active planning views.
  if (task.is_someday) return false
  if (mode === 'active') return !task.completed
  if (!task.due_date) return false
  const dueKey = task.due_date.slice(0, 10)
  if (mode === 'overdue') return !task.completed && dueKey < todayKey
  if (mode === 'today') return dueKey === todayKey
  if (mode === 'thisWeek') return dueKey >= weekStart && dueKey <= weekEnd
  return true
}

export function TaskListPage({ item }: ModuleComponentProps) {
  const { data: tasks, isLoading } = useTasks(item.id)
  const createTask = useCreateTask(item.id)
  const bulkUpdateTasks = useBulkUpdateTasks(item.id)
  const bulkDeleteTasks = useBulkDeleteTasks(item.id)
  const [mode, setMode] = useState<Mode>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const topLevelTasks = useMemo(() => (tasks ?? []).filter((task) => task.parent_task_id === null), [tasks])

  const subtasksByParent = useMemo(() => {
    const map = new Map<string, TaskRow[]>()
    for (const task of tasks ?? []) {
      if (!task.parent_task_id) continue
      const list = map.get(task.parent_task_id) ?? []
      list.push(task)
      map.set(task.parent_task_id, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position)
    return map
  }, [tasks])

  const visibleTasks = useMemo(() => {
    const now = new Date()
    const todayKey = toDateKey(now)
    const weekStart = weekStartKey(now)
    const weekEnd = weekEndKey(now)
    return topLevelTasks
      .filter((task) => matchesMode(task, mode, todayKey, weekStart, weekEnd))
      .sort((a, b) => a.position - b.position)
  }, [topLevelTasks, mode])

  function handleAddTask(title: string, dueDate?: string | null) {
    createTask.mutate({ title, position: nextAppendPosition(topLevelTasks), dueDate })
  }

  function toggleSelectMode() {
    setSelectMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  function toggleSelect(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function handleBulkComplete() {
    bulkUpdateTasks.mutate(
      { taskIds: Array.from(selectedIds), input: { completed: true } },
      { onSuccess: () => setSelectedIds(new Set()) },
    )
  }

  function handleBulkSomeday() {
    bulkUpdateTasks.mutate(
      { taskIds: Array.from(selectedIds), input: { is_someday: true } },
      { onSuccess: () => setSelectedIds(new Set()) },
    )
  }

  function handleBulkDelete() {
    bulkDeleteTasks.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set())
        setBulkDeleteOpen(false)
      },
    })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <TabsList>
            <TabsTrigger value="all">{t.tasks.all}</TabsTrigger>
            <TabsTrigger value="active">{t.tasks.active}</TabsTrigger>
            <TabsTrigger value="completed">{t.tasks.completed}</TabsTrigger>
            <TabsTrigger value="overdue">{t.tasks.overdue}</TabsTrigger>
            <TabsTrigger value="today">{t.tasks.today}</TabsTrigger>
            <TabsTrigger value="thisWeek">{t.tasks.thisWeek}</TabsTrigger>
            <TabsTrigger value="someday">{t.tasks.someday}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {t.taskFields.manage}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <TaskFieldsManager taskListId={item.id} />
            </PopoverContent>
          </Popover>

          <Button
            variant={selectMode ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 shrink-0"
            title={selectMode ? t.tasks.selectModeDisable : t.tasks.selectModeEnable}
            onClick={toggleSelectMode}
          >
            <ListChecks className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddTaskInput placeholder={t.tasks.addTask} onSubmit={handleAddTask} />

      {selectMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {t.tasks.selectedCount}: {selectedIds.size}
          </span>
          <Button size="sm" variant="outline" onClick={handleBulkComplete}>
            {t.tasks.bulkComplete}
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkSomeday}>
            {t.tasks.bulkSomeday}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            {t.tasks.bulkDelete}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && visibleTasks.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">{t.tasks.emptyList}</p>
      )}

      {!isLoading && visibleTasks.length > 0 && (
        <div className="space-y-1">
          {visibleTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              taskListId={item.id}
              subtasks={subtasksByParent.get(task.id) ?? []}
              selectMode={selectMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`${t.tasks.bulkDeleteTitlePrefix} ${selectedIds.size} ${t.tasks.tasksWord}?`}
        description={t.tasks.bulkDeleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
