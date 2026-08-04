import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'
import { CalendarClock, CheckCircle2, Clock4, KanbanSquare } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/modules/icon-map'
import { formatDuration } from '@/features/time/hooks'
import { useUpcomingDeadlines } from '@/features/home/hooks'
import { t } from '@/i18n'
import { useClosedCardsThisWeek, useCompletedTasksThisWeek, useWeeklyTimeSummary } from '../hooks'

function formatDate(iso: string): string {
  return format(new Date(iso), 'd MMMM', { locale: ukLocale })
}

export default function WeeklyReviewPage() {
  const navigate = useNavigate()
  const { data: completedTasks, isLoading: completedTasksLoading } = useCompletedTasksThisWeek()
  const { data: closedCardsReport, isLoading: closedCardsLoading } = useClosedCardsThisWeek()
  const closedCards = closedCardsReport?.cards
  const { data: timeSummary, isLoading: timeSummaryLoading } = useWeeklyTimeSummary()
  const { data: upcomingDeadlines, isLoading: upcomingLoading } = useUpcomingDeadlines()

  const topProjects = (timeSummary?.projects ?? []).slice(0, 3)

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t.reports.weeklyReviewTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.reports.weeklyReviewSubtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4" />
            {t.reports.completedTasksSection}
            {!completedTasksLoading && <Badge variant="secondary">{completedTasks?.length ?? 0}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {completedTasksLoading && <Skeleton className="h-10 w-full" />}
          {!completedTasksLoading && (completedTasks?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">{t.reports.noCompletedTasks}</p>
          )}
          {completedTasks?.map((task) => (
            <button
              key={task.id}
              onClick={() => navigate(`/app/item/${task.task_list_id}`)}
              className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate">{task.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(task.updated_at)}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KanbanSquare className="h-4 w-4" />
            {t.reports.closedCardsSection}
            {!closedCardsLoading && <Badge variant="secondary">{closedCards?.length ?? 0}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {closedCardsLoading && <Skeleton className="h-10 w-full" />}
          {!closedCardsLoading && (closedCards?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">{t.reports.noClosedCards}</p>
          )}
          {!closedCardsLoading && closedCardsReport?.avgCycleDays != null && (
            <p className="text-xs text-muted-foreground">
              {t.reports.avgCycleDaysPrefix} {closedCardsReport.avgCycleDays} {t.reports.avgCycleDaysSuffix}
            </p>
          )}
          {closedCards?.map((card) => (
            <button
              key={card.id}
              onClick={() => navigate(`/app/item/${card.board_id}`)}
              className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate">{card.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(card.closed_at)} · {card.cycleDays} {t.reports.cycleDaysUnit}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock4 className="h-4 w-4" />
            {t.reports.timeTrackedSection}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeSummaryLoading && <Skeleton className="h-10 w-full" />}
          {!timeSummaryLoading && (
            <>
              <p className="text-2xl font-semibold text-foreground">
                {formatDuration(timeSummary?.totalSeconds ?? 0)}
              </p>
              {topProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.reports.noTimeTracked}</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.reports.topProjects}
                  </p>
                  {topProjects.map(({ item, totalSeconds }) => {
                    const Icon = resolveIcon(item.icon, item.type)
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/app/item/${item.id}`)}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                      >
                        <Icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatDuration(totalSeconds)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            {t.reports.upcomingSection}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {upcomingLoading && <Skeleton className="h-10 w-full" />}
          {!upcomingLoading && (upcomingDeadlines?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">{t.reports.noUpcoming}</p>
          )}
          {upcomingDeadlines?.map((entry) => (
            <button
              key={`${entry.sourceType}-${entry.id}`}
              onClick={() => navigate(`/app/item/${entry.targetItemId}`)}
              className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate">{entry.title}</span>
              {entry.due_date && <Badge variant="secondary">{formatDate(entry.due_date)}</Badge>}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
