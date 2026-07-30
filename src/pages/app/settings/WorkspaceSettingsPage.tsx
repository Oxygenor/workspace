import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentWorkspace, useRenameWorkspace } from '@/features/workspace/hooks'
import { useExportWorkspace } from '@/features/workspace/use-export'
import { t } from '@/i18n'

export default function WorkspaceSettingsPage() {
  const { workspace, isLoading } = useCurrentWorkspace()
  const renameWorkspace = useRenameWorkspace(workspace?.id)
  const { exportWorkspace, isExporting } = useExportWorkspace()
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
          <CardTitle className="text-base">{t.workspaceSettings.exportTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.workspaceSettings.exportDescription}</p>
          <Button variant="outline" disabled={isExporting} onClick={() => exportWorkspace(workspace)}>
            {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
            {isExporting ? t.workspaceSettings.exporting : t.workspaceSettings.exportButton}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
