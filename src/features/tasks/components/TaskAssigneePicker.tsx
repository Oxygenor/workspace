import { UserPlus } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCurrentWorkspace, useWorkspaceMembers } from '@/features/workspace/hooks'
import { t } from '@/i18n'
import type { TaskRow } from '@/types/database'
import { useUpdateTask } from '../hooks'

interface TaskAssigneePickerProps {
  task: TaskRow
  taskListId: string
}

export function TaskAssigneePicker({ task, taskListId }: TaskAssigneePickerProps) {
  const { workspace } = useCurrentWorkspace()
  const { data: members } = useWorkspaceMembers(workspace?.id)
  const updateTask = useUpdateTask(taskListId)

  const assignedMember = (members ?? []).find((m) => m.user_id === task.assignee_id)

  function toggle(userId: string) {
    updateTask.mutate({ taskId: task.id, input: { assignee_id: task.assignee_id === userId ? null : userId } })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={assignedMember?.profile?.full_name ?? t.tasks.assignee}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground"
        >
          {assignedMember ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignedMember.profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {(assignedMember.profile?.full_name ?? '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-1" align="start">
        {(members ?? []).map((member) => {
          const isAssigned = member.user_id === task.assignee_id
          return (
            <label
              key={member.user_id}
              className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-accent"
            >
              <Checkbox checked={isAssigned} onCheckedChange={() => toggle(member.user_id)} />
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {(member.profile?.full_name ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{member.profile?.full_name ?? '—'}</span>
            </label>
          )
        })}
        {(members ?? []).length === 0 && <p className="p-1.5 text-sm text-muted-foreground">{t.home.noData}</p>}
      </PopoverContent>
    </Popover>
  )
}
