import { useEffect, useState } from 'react'

import { formatDuration } from '../format'

interface LiveElapsedProps {
  startedAt: string
}

export function LiveElapsed({ startedAt }: LiveElapsedProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const elapsedSeconds = Math.max(0, (now - new Date(startedAt).getTime()) / 1000)

  return <span className="tabular-nums">{formatDuration(elapsedSeconds)}</span>
}
