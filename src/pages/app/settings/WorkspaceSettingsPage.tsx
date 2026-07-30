import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentWorkspace, useRenameWorkspace, useWorkspaceMembers } from '@/features/workspace/hooks'
import { t } from '@/i18n'

const ROLE_LABELS: Record<string, string> = {
  owner: t.workspaceSettings.roleOwner,
  admin: t.workspaceSettings.roleAdmin,
  member: t.workspaceSettings.roleMember,
  viewer: t.workspaceSettings.roleViewer,
}

export default function WorkspaceSettingsPage() {
  const { workspace, isLoading } = useCurrentWorkspace()
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspace?.id)
  const renameWorkspace = useRenameWorkspace(workspace?.id)
  const [name, setName] = useState('')

  useEffect(() => {
    if (workspace) setName(workspace.name)
  }, [workspace])

  if (isLoading || !workspace) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-foreground">{t.workspaceSettings.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.workspaceSettings.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim() && name.trim() !== workspace.name) {
                renameWorkspace.mutate(name.trim())
              }
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="workspaceName">{t.workspaceSettings.name}</Label>
              <Input id="workspaceName" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={renameWorkspace.isPending || name.trim() === workspace.name}>
              {renameWorkspace.isPending && <Loader2 className="animate-spin" />}
              {t.common.save}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.workspaceSettings.members}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {membersLoading && <Skeleton className="h-12 w-full" />}
          {members?.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback>{(member.profile?.full_name ?? '?').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm text-foreground">{member.profile?.full_name ?? '—'}</span>
              <Badge variant="secondary">{ROLE_LABELS[member.role] ?? member.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
