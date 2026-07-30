import { useState } from 'react'
import { toast } from 'sonner'

import type { WorkspaceRow } from '@/types/database'
import { buildWorkspaceExport, downloadWorkspaceExport } from './export'

export function useExportWorkspace() {
  const [isExporting, setIsExporting] = useState(false)

  async function exportWorkspace(workspace: WorkspaceRow) {
    setIsExporting(true)
    try {
      const data = await buildWorkspaceExport(workspace)
      downloadWorkspaceExport(data)
      toast.success('Бекап Workspace завантажено')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося створити бекап.')
    } finally {
      setIsExporting(false)
    }
  }

  return { exportWorkspace, isExporting }
}
