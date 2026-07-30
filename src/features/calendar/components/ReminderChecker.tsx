import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { fetchReminderCandidates } from '../api-reminders'

const CHECK_INTERVAL_MS = 30_000

/**
 * Fires calendar reminders while the app is open in a tab: a toast always,
 * plus a native browser Notification if permission was already granted.
 * This is NOT push — closing the tab means no reminders fire. True push
 * would need a service worker + a server-side scheduler, which this
 * personal, backend-less-beyond-Supabase app doesn't have yet.
 */
export function ReminderChecker() {
  const navigate = useNavigate()
  const firedIds = useRef(new Set<string>())

  const { data: candidates } = useQuery({
    queryKey: ['calendar', 'reminder-candidates'],
    queryFn: fetchReminderCandidates,
    refetchInterval: 5 * 60 * 1000,
  })

  useEffect(() => {
    function check() {
      if (!candidates) return
      const now = Date.now()

      for (const event of candidates) {
        if (firedIds.current.has(event.id)) continue

        const startsAt = new Date(event.starts_at).getTime()
        const triggerAt = startsAt - event.reminder_minutes_before * 60_000
        if (now < triggerAt || now - triggerAt > CHECK_INTERVAL_MS * 2) continue

        firedIds.current.add(event.id)

        const message = `${event.title} — ${new Date(event.starts_at).toLocaleString('uk-UA', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}`

        toast(message, {
          action: {
            label: 'Відкрити',
            onClick: () => navigate(`/app/item/${event.calendar_id}`),
          },
        })

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Нагадування', { body: message })
        }
      }
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [candidates, navigate])

  return null
}
