import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn, openDatePicker } from '@/lib/utils'
import { t } from '@/i18n'
import {
  useAddDateException,
  useDaysOff,
  useRemoveDateException,
  useScheduleSettings,
  useSetWeekdayOff,
  useUpdateScheduleSettings,
} from '../hooks'

const WEEKDAYS = [
  { value: 1, label: t.schedule.weekdayMon },
  { value: 2, label: t.schedule.weekdayTue },
  { value: 3, label: t.schedule.weekdayWed },
  { value: 4, label: t.schedule.weekdayThu },
  { value: 5, label: t.schedule.weekdayFri },
  { value: 6, label: t.schedule.weekdaySat },
  { value: 0, label: t.schedule.weekdaySun },
]

interface WorkHoursDraft {
  work_start: string
  work_end: string
  break_start: string
  break_end: string
}

export function ScheduleSettings() {
  const { data: settings, isLoading: settingsLoading } = useScheduleSettings()
  const updateSettings = useUpdateScheduleSettings()
  const { data: daysOff, isLoading: daysOffLoading } = useDaysOff()
  const setWeekdayOff = useSetWeekdayOff()
  const addException = useAddDateException()
  const removeException = useRemoveDateException()

  const [draft, setDraft] = useState<WorkHoursDraft | null>(null)
  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionIsWorking, setExceptionIsWorking] = useState(false)

  useEffect(() => {
    if (!settings) return
    setDraft({
      work_start: settings.work_start.slice(0, 5),
      work_end: settings.work_end.slice(0, 5),
      break_start: settings.break_start?.slice(0, 5) ?? '',
      break_end: settings.break_end?.slice(0, 5) ?? '',
    })
  }, [settings])

  function commitDraft(next: WorkHoursDraft) {
    setDraft(next)
    updateSettings.mutate({
      work_start: next.work_start,
      work_end: next.work_end,
      break_start: next.break_start || null,
      break_end: next.break_end || null,
    })
  }

  function handleAddException() {
    if (!exceptionDate) return
    addException.mutate(
      { date: exceptionDate, isWorking: exceptionIsWorking },
      { onSuccess: () => setExceptionDate('') },
    )
  }

  const offWeekdays = new Set(
    (daysOff ?? []).filter((d) => d.weekday !== null && !d.is_working).map((d) => d.weekday),
  )
  const exceptions = (daysOff ?? []).filter((d) => d.specific_date !== null)

  if (settingsLoading || daysOffLoading || !draft) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t.schedule.workHoursTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.schedule.workHoursDescription}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t.schedule.workStartLabel}</label>
            <Input
              type="time"
              value={draft.work_start}
              onChange={(e) => setDraft({ ...draft, work_start: e.target.value })}
              onBlur={() => commitDraft(draft)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t.schedule.workEndLabel}</label>
            <Input
              type="time"
              value={draft.work_end}
              onChange={(e) => setDraft({ ...draft, work_end: e.target.value })}
              onBlur={() => commitDraft(draft)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t.schedule.breakStartLabel}</label>
            <Input
              type="time"
              value={draft.break_start}
              onChange={(e) => setDraft({ ...draft, break_start: e.target.value })}
              onBlur={() => commitDraft(draft)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t.schedule.breakEndLabel}</label>
            <Input
              type="time"
              value={draft.break_end}
              onChange={(e) => setDraft({ ...draft, break_end: e.target.value })}
              onBlur={() => commitDraft(draft)}
              className="h-9"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-sm text-foreground">{t.schedule.idleNudgeToggle}</span>
          <Switch
            checked={settings?.idle_nudge_enabled ?? true}
            onCheckedChange={(checked) => updateSettings.mutate({ idle_nudge_enabled: checked })}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t.schedule.daysOffTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.schedule.daysOffDescription}</p>

        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => {
            const isOff = offWeekdays.has(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => setWeekdayOff.mutate({ weekday: day.value, isOff: !isOff })}
                className={cn(
                  'h-9 w-11 rounded-md border text-sm font-medium transition-colors',
                  isOff
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-transparent text-foreground hover:bg-muted',
                )}
              >
                {day.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">{t.schedule.exceptionsTitle}</p>

          {exceptions.length > 0 && (
            <ul className="space-y-1.5">
              {exceptions.map((exception) => (
                <li
                  key={exception.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  <span>
                    {format(parseISO(exception.specific_date as string), 'd MMM yyyy', { locale: ukLocale })} —{' '}
                    {exception.is_working ? t.schedule.exceptionWorking : t.schedule.exceptionOff}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeException.mutate(exception.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={exceptionDate}
              onClick={openDatePicker}
              onChange={(e) => setExceptionDate(e.target.value)}
              className="h-9 w-40"
            />
            <Select
              value={exceptionIsWorking ? 'working' : 'off'}
              onValueChange={(value) => setExceptionIsWorking(value === 'working')}
            >
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{t.schedule.exceptionOff}</SelectItem>
                <SelectItem value="working">{t.schedule.exceptionWorking}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={handleAddException} disabled={!exceptionDate}>
              <Plus className="h-3.5 w-3.5" />
              {t.schedule.addException}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
