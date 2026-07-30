import { useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { SplitPane } from '../components/SplitPane'

/** URL placeholder used for an empty slot when the other side already has an id (positional params can't be skipped). */
const EMPTY_SLOT = '_'

function normalizeId(raw: string | undefined): string | undefined {
  return raw && raw !== EMPTY_SLOT ? raw : undefined
}

function buildSplitPath(leftId: string | undefined, rightId: string | undefined): string {
  if (!leftId && !rightId) return '/app/split'
  if (leftId && !rightId) return `/app/split/${leftId}`
  if (!leftId && rightId) return `/app/split/${EMPTY_SLOT}/${rightId}`
  return `/app/split/${leftId}/${rightId}`
}

/**
 * Standalone side-by-side view of two workspace items, driven entirely by the
 * `leftId`/`rightId` route params so each pane's selection is shareable/bookmarkable.
 * Route: /app/split/:leftId?/:rightId?
 */
export default function SplitViewPage() {
  const params = useParams<{ leftId?: string; rightId?: string }>()
  const navigate = useNavigate()
  const { data: items, isLoading } = useWorkspaceItems()

  const leftId = normalizeId(params.leftId)
  const rightId = normalizeId(params.rightId)

  function handleSelect(side: 'left' | 'right', id: string) {
    navigate(buildSplitPath(side === 'left' ? id : leftId, side === 'right' ? id : rightId))
  }

  function handleChangeItem(side: 'left' | 'right') {
    navigate(buildSplitPath(side === 'left' ? undefined : leftId, side === 'right' ? undefined : rightId))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-sm font-semibold text-foreground">{t.splitView.title}</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/home')}>
          <X className="h-4 w-4" />
          {t.splitView.close}
        </Button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-1/2 flex-col overflow-hidden border-r border-border">
          <SplitPane
            itemId={leftId}
            items={items}
            isLoading={isLoading}
            onSelect={(id) => handleSelect('left', id)}
            onChangeItem={() => handleChangeItem('left')}
          />
        </div>
        <div className="flex w-1/2 flex-col overflow-hidden">
          <SplitPane
            itemId={rightId}
            items={items}
            isLoading={isLoading}
            onSelect={(id) => handleSelect('right', id)}
            onChangeItem={() => handleChangeItem('right')}
          />
        </div>
      </div>
    </div>
  )
}
