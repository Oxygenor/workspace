import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { t } from '@/i18n'
import { useUiStore } from '@/stores/ui-store'
import { useCreateItem, useWorkspaceItems } from '../hooks'
import { nextAppendPosition } from '../tree-utils'

/** Wires the app-wide Ctrl/Cmd+N shortcut: creates a new root-level section and opens it in rename mode. */
export function GlobalHotkeys() {
  const { data: items } = useWorkspaceItems()
  const createItem = useCreateItem()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
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
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  return null
}
