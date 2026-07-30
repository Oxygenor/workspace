import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { t } from '@/i18n'
import { useUiStore } from '@/stores/ui-store'
import { useCreateItem, useWorkspaceItems } from '../hooks'
import { nextAppendPosition } from '../tree-utils'

/**
 * Wires app-wide keyboard shortcuts:
 * - Ctrl/Cmd+N — creates a new root-level section and opens it in rename mode.
 * - Ctrl/Cmd+1..9 — jumps straight to the Nth root-level section/module (in tree order),
 *   for fast switching between your different jobs/projects without touching the mouse.
 */
export function GlobalHotkeys() {
  const { data: items } = useWorkspaceItems()
  const createItem = useCreateItem()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        const rootSiblings = (items ?? []).filter((item) => item.parent_id === null)
        createItem.mutate(
          { type: 'section', name: t.tree.untitledSection, parentId: null, position: nextAppendPosition(rootSiblings) },
          {
            onSuccess: (created) => {
              setPendingRenameItemId(created.id)
              navigate(`/app/item/${created.id}`)
            },
          },
        )
        return
      }

      if (event.key >= '1' && event.key <= '9') {
        const rootItems = (items ?? [])
          .filter((item) => item.parent_id === null)
          .sort((a, b) => a.position - b.position)
        const index = Number(event.key) - 1
        const target = rootItems[index]
        if (target) {
          event.preventDefault()
          navigate(`/app/item/${target.id}`)
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  return null
}
