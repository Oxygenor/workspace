import { Plus } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCurrentWorkspace, useWorkspaceMembers } from '@/features/workspace/hooks'
import { t } from '@/i18n'
import { useCardAssignees, useToggleAssignee } from '../hooks'

interface AssigneesPickerProps {
  cardId: string
  boardId: string
}

export function AssigneesPicker({ cardId, boardId }: AssigneesPickerProps) {
  const { workspace } = useCurrentWorkspace()
  const { data: members } = useWorkspaceMembers(workspace?.id)
  const { data: assignees } = useCardAssignees(cardId)
  const toggleAssignee = useToggleAssignee(cardId, boardId)

  const assignedIds = new Set(assignees?.map((a) => a.user_id) ?? [])
  const assignedMembers = (members ?? []).filter((m) => assignedIds.has(m.user_id))

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignedMembers.map((member) => (
        <Avatar key={member.user_id} className="h-7 w-7" title={member.profile?.full_name ?? ''}>
          <AvatarImage src={member.profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{(member.profile?.full_name ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-1" align="start">
          {(members ?? []).map((member) => {
            const isAssigned = assignedIds.has(member.user_id)
            return (
              <label
                key={member.user_id}
                className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={isAssigned}
                  onCheckedChange={() => toggleAssignee.mutate({ userId: member.user_id, isAssigned })}
                />
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
          {(members ?? []).length === 0 && (
            <p className="p-1.5 text-sm text-muted-foreground">{t.home.noData}</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
