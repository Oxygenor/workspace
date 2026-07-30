import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock4 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { resolveIcon } from '@/lib/modules/icon-map'
import { formatDuration } from '@/features/time/hooks'
import { t } from '@/i18n'
import { useTimeReport } from '../hooks'
import type { TimeReportPeriod } from '../api'

const PERIOD_OPTIONS: { value: TimeReportPeriod; label: string }[] = [
  { value: 'thisWeek', label: t.reports.periodThisWeek },
  { value: 'lastWeek', label: t.reports.periodLastWeek },
  { value: 'thisMonth', label: t.reports.periodThisMonth },
]

export default function TimeReportPage() {
  const [period, setPeriod] = useState<TimeReportPeriod>('thisWeek')
  const { data, isLoading } = useTimeReport(period)
  const navigate = useNavigate()

  const projects = data?.projects ?? []
  const maxSeconds = projects.reduce((max, project) => Math.max(max, project.totalSeconds), 0)

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{t.reports.timeReportTitle}</h1>
        <Tabs value={period} onValueChange={(value) => setPeriod(value as TimeReportPeriod)}>
          <TabsList>
            {PERIOD_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Clock4 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {isLoading ? '—' : formatDuration(data?.totalSeconds ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{t.reports.totalTracked}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.reports.byProject}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {!isLoading && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Clock4 className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-foreground">{t.reports.noEntriesTitle}</p>
              <p className="text-sm text-muted-foreground">{t.reports.noEntriesDescription}</p>
            </div>
          )}

          {projects.map(({ item, totalSeconds }) => {
            const Icon = resolveIcon(item.icon, item.type)
            const widthPercent = maxSeconds > 0 ? Math.max(4, (totalSeconds / maxSeconds) * 100) : 0
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/app/item/${item.id}`)}
                className="flex w-full flex-col gap-1.5 rounded-md p-2 text-left hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${item.color}22` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {formatDuration(totalSeconds)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${widthPercent}%`, backgroundColor: item.color }}
                  />
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
