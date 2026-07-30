import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, Clock, FolderKanban, Plus, Star, UserCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import { useAuth } from '@/features/auth/use-auth'
import { useProfile } from '@/features/profile/hooks'
import { useFavorites } from '@/features/favorites/hooks'
import { useCreateItem, useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { CreateItemMenu } from '@/features/workspace-tree/components/CreateItemMenu'
import { nextAppendPosition } from '@/features/workspace-tree/tree-utils'
import { useMyAssignedItems, useOverdueDeadlines, useUpcomingDeadlines } from '@/features/home/hooks'
import { ActivityFeed } from '@/features/activity/components/ActivityFeed'
import { useUiStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return t.home.greetingMorning
  if (hour < 18) return t.home.greetingDay
  return t.home.greetingEvening
}

export default function HomePage() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { user } = useAuth()
  const { data: items, isLoading: itemsLoading } = useWorkspaceItems()
  const { data: favorites } = useFavorites()
  const { data: assignedItems, isLoading: assignedLoading } = useMyAssignedItems()
  const { data: upcomingDeadlines, isLoading: upcomingLoading } = useUpcomingDeadlines()
  const { data: overdueDeadlines, isLoading: overdueLoading } = useOverdueDeadlines()
  const recentItemIds = useUiStore((s) => s.recentItemIds)
  const navigate = useNavigate()
  const createItem = useCreateItem()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)

  const displayName = profile?.full_name || user?.email?.split('@')[0] || ''
  const isLoading = profileLoading || itemsLoading

  const recentItems = recentItemIds
    .map((id) => items?.find((i) => i.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 5)

  const favoriteItems = (favorites ?? [])
    .map((f) => items?.find((i) => i.id === f.item_id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 5)

  const activeProjectsCount = (items ?? []).filter((i) => i.type === 'kanban').length

  function handleQuickCreate(type: Parameters<typeof createItem.mutate>[0]['type']) {
    const rootSiblings = (items ?? []).filter((i) => i.parent_id === null)
    createItem.mutate(
      { type, name: t.tree.untitledSection, parentId: null, position: nextAppendPosition(rootSiblings) },
      {
        onSuccess: (created) => {
          setPendingRenameItemId(created.id)
          navigate(`/app/item/${created.id}`)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {greeting()}
            {displayName ? `, ${displayName}` : ''}!
          </h1>
        </div>
        <CreateItemMenu onSelect={handleQuickCreate} align="end">
          <Button>
            <Plus />
            {t.home.quickCreate}
          </Button>
        </CreateItemMenu>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FolderKanban className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{isLoading ? '—' : activeProjectsCount}</p>
              <p className="text-xs text-muted-foreground">{t.home.activeProjects}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{assignedLoading ? '—' : assignedItems?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t.home.assignedToMe}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{overdueLoading ? '—' : overdueDeadlines?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t.home.overdueTasks}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              {t.home.recentlyOpened}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading && <Skeleton className="h-10 w-full" />}
            {!isLoading && recentItems.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.home.noData}</p>
            )}
            {recentItems.map((item) => {
              const Icon = resolveIcon(item.icon, item.type)
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/app/item/${item.id}`)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.name}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4" />
              {t.home.favoriteModules}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading && <Skeleton className="h-10 w-full" />}
            {!isLoading && favoriteItems.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.home.noData}</p>
            )}
            {favoriteItems.map((item) => {
              const Icon = resolveIcon(item.icon, item.type)
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/app/item/${item.id}`)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.name}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4" />
              {t.home.assignedToMe}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {assignedLoading && <Skeleton className="h-10 w-full" />}
            {!assignedLoading && (assignedItems?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">{t.home.noData}</p>
            )}
            {assignedItems?.slice(0, 5).map((entry) => (
              <button
                key={`${entry.sourceType}-${entry.id}`}
                onClick={() => navigate(`/app/item/${entry.targetItemId}`)}
                className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{entry.title}</span>
                {entry.due_date && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(entry.due_date).toLocaleDateString('uk-UA')}
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              {t.home.upcomingDeadlines}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingLoading && <Skeleton className="h-10 w-full" />}
            {!upcomingLoading && (upcomingDeadlines?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">{t.home.noData}</p>
            )}
            {upcomingDeadlines?.slice(0, 5).map((entry) => (
              <button
                key={`${entry.sourceType}-${entry.id}`}
                onClick={() => navigate(`/app/item/${entry.targetItemId}`)}
                className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{entry.title}</span>
                <Badge variant="secondary">{new Date(entry.due_date!).toLocaleDateString('uk-UA')}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t.home.overdueTasks}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {overdueLoading && <Skeleton className="h-10 w-full" />}
            {!overdueLoading && (overdueDeadlines?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">{t.home.noData}</p>
            )}
            {overdueDeadlines?.slice(0, 5).map((entry) => (
              <button
                key={`${entry.sourceType}-${entry.id}`}
                onClick={() => navigate(`/app/item/${entry.targetItemId}`)}
                className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{entry.title}</span>
                <Badge variant="destructive">{new Date(entry.due_date!).toLocaleDateString('uk-UA')}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.home.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
