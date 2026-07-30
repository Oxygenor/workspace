import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

import { resolveIcon } from '@/lib/modules/icon-map'
import { useWorkspaceItems } from '../hooks'
import { buildItemMap } from '../tree-utils'
import { t } from '@/i18n'

interface BreadcrumbsProps {
  itemId: string
}

export function Breadcrumbs({ itemId }: BreadcrumbsProps) {
  const { data: items } = useWorkspaceItems()
  const itemMap = buildItemMap(items ?? [])

  const chain = []
  let current = itemMap.get(itemId)
  while (current) {
    chain.unshift(current)
    current = current.parent_id ? itemMap.get(current.parent_id) : undefined
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/app/home" className="flex items-center gap-1 hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
        {t.nav.home}
      </Link>
      {chain.map((item) => {
        const Icon = resolveIcon(item.icon, item.type)
        return (
          <Fragment key={item.id}>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/app/item/${item.id}`} className="flex items-center gap-1 truncate hover:text-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{item.name}</span>
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}
