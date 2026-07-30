import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CalendarDays, FolderKanban, Pin, Plus, Star } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/modules/icon-map'
import { t } from '@/i18n'
import { useAuth } from '@/features/auth/use-auth'
import { useProfile } from '@/features/profile/hooks'
import { useFavorites } from '@/features/favorites/hooks'
import { useCreateItem, useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { CreateItemMenu } from '@/features/workspace-tree/components/CreateItemMenu'
import { nextAppendPosition } from '@/features/workspace-tree/tree-utils'
import { useMyDay, useToggleTaskCompleted, useUpcomingDeadlines } from '@/features/home/hooks'
import type { DeadlineEntry } from '@/features/home/api'
import { usePinnedNotes } from '@/features/notes/hooks'
import { useUiStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return t.home.greetingMorning
  if (hour < 18) return t.home.greetingDay
  return t.home.greetingEvening
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA')
}

export default function HomePage() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { user } = useAuth()
  const { data: items, isLoading: itemsLoading } = useWorkspaceItems()
  const { data: favorites } = useFavorites()
  const { data: myDay, isLoading: myDayLoading } = useMyDay()
  const { data: upcomingDeadlines, isLoading: upcomingLoading } = useUpcomingDeadlines()
  const { data: pinnedNotes } = usePinnedNotes()
  const toggleTaskCompleted = useToggleTaskCompleted()
  const navigate = useNavigate()
  const createItem = useCreateItem()
  const setPendingRenameItemId = useUiStore((s) => s.setPendingRenameItemId)

  const displayName = profile?.full_name || user?.email?.split('@')[0] || ''
  const isLoading = profileLoading || itemsLoading

  const favoriteItems = (favorites ?? [])
    .map((f) => items?.find((i) => i.id === f.item_id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 5)

  const activeProjectsCount = (items ?? []).filter((i) => i.type === 'kanban').length
  const overdue = myDay?.overdue ?? []
  const today = myDay?.today ?? []

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

  function renderEntry(entry: DeadlineEntry, variant: 'overdue' | 'today') {
    return (
      <div key={`${entry.sourceType}-${entry.id}`} className="flex items-center gap-2 rounded-md p-2 hover:bg-accent">
        {entry.sourceType === 'task' ? (
          <Checkbox
            checked={entry.completed ?? false}
            onCheckedChange={(checked) =>
              toggleTaskCompleted.mutate({ taskId: entry.id, completed: checked === true, taskListId: entry.targetItemId })
            }
          />
        ) : (
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <button
          onClick={() => navigate(`/app/item/${entry.targetItemId}`)}
          className="flex-1 truncate text-left text-sm"
        >
          {entry.title}
        </button>
        {entry.due_date && (
          <Badge variant={variant === 'overdue' ? 'destructive' : 'secondary'}>{formatDate(entry.due_date)}</Badge>
        )}
      </div>
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
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{myDayLoading ? '—' : today.length}</p>
              <p className="text-xs text-muted-foreground">{t.home.todaySection}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{myDayLoading ? '—' : overdue.length}</p>
              <p className="text-xs text-muted-foreground">{t.home.overdueTasks}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            {t.home.myDay}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myDayLoading && <Skeleton className="h-10 w-full" />}
          {!myDayLoading && overdue.length === 0 && today.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.home.myDayEmpty}</p>
          )}
          {overdue.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">{t.home.overdueSection}</p>
              {overdue.map((entry) => renderEntry(entry, 'overdue'))}
            </div>
          )}
          {today.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.home.todaySection}</p>
              {today.map((entry) => renderEntry(entry, 'today'))}
            </div>
          )}
        </CardContent>
      </Card>

      {pinnedNotes && pinnedNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pin className="h-4 w-4" />
              {t.notesPin.pinnedSectionTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {pinnedNotes.map((note) => {
              const Icon = resolveIcon(note.icon, note.type)
              return (
                <button
                  key={note.id}
                  onClick={() => navigate(`/app/item/${note.id}`)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{note.name}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                <Badge variant="secondary">{formatDate(entry.due_date!)}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
