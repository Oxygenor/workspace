import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    function goOnline() {
      setIsOffline(false)
    }
    function goOffline() {
      setIsOffline(true)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      Немає підключення до мережі — показані останні збережені дані. Зміни не зберігатимуться, поки з'єднання не відновиться.
    </div>
  )
}
