import {
  Archive,
  FilePlus,
  Move,
  Pencil,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { useRecentActivity } from '../hooks'
import type { ActivityWithActor } from '../api'

const ACTION_ICONS: Record<string, LucideIcon> = {
  created: FilePlus,
  renamed: Pencil,
  archived: Archive,
  restored: RotateCcw,
  deleted: Trash2,
  moved: Move,
  moved_card: Move,
}

function describe(entry: ActivityWithActor): string {
  const name = typeof entry.metadata.name === 'string' ? entry.metadata.name : null
  const actor = entry.actor?.full_name ?? '—'
  switch (entry.action) {
    case 'created':
      return `${actor} створив(ла)${name ? ` «${name}»` : ' елемент'}`
    case 'renamed':
      return `${actor} перейменував(ла)${name ? ` на «${name}»` : ' елемент'}`
    case 'archived':
      return `${actor} архівував(ла)${name ? ` «${name}»` : ' елемент'}`
    case 'restored':
      return `${actor} відновив(ла)${name ? ` «${name}»` : ' елемент'}`
    case 'deleted':
      return `${actor} видалив(ла)${name ? ` «${name}»` : ' елемент'}`
    case 'moved':
      return `${actor} перемістив(ла) елемент`
    case 'moved_card':
      return `${actor} перемістив(ла) картку`
    default:
      return `${actor}: ${entry.action}`
  }
}

interface ActivityFeedProps {
  limit?: number
}

export function ActivityFeed({ limit = 5 }: ActivityFeedProps) {
  const { data: activity, isLoading } = useRecentActivity(limit)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (!activity || activity.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.home.noData}</p>
  }

  return (
    <div className="space-y-3">
      {activity.map((entry) => {
        const Icon = ACTION_ICONS[entry.action] ?? Pencil
        return (
          <div key={entry.id} className="flex items-start gap-2 text-sm">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={entry.actor?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {(entry.actor?.full_name ?? '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-foreground">{describe(entry)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        )
      })}
    </div>
  )
}
