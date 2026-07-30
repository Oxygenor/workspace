import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { getIcsFeedUrl } from '../api'
import { useGenerateTelegramCode, useUserIntegrations } from '../hooks'

export function IntegrationsSettings() {
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Poll for updates while a code is on screen so the "Підключено" state
  // appears automatically once the user completes the /start <code> flow
  // in Telegram, without needing to refresh the page.
  const { data: integrations, isLoading } = useUserIntegrations(Boolean(pendingCode))
  const generateCode = useGenerateTelegramCode()

  const isTelegramConnected = Boolean(integrations?.telegram_chat_id)

  useEffect(() => {
    if (isTelegramConnected) setPendingCode(null)
  }, [isTelegramConnected])

  function handleGenerateCode() {
    generateCode.mutate(undefined, {
      onSuccess: (code) => {
        setPendingCode(code)
        toast.success(t.integrations.telegramCodeGenerated)
      },
    })
  }

  async function handleCopyIcsUrl() {
    if (!integrations) return
    try {
      await navigator.clipboard.writeText(getIcsFeedUrl(integrations.ics_feed_token))
      setCopied(true)
      toast.success(t.integrations.icsCopied)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t.integrations.icsCopyFailed)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t.integrations.telegramTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.integrations.telegramDescription}</p>

        {isLoading && <Skeleton className="h-9 w-40" />}

        {!isLoading && isTelegramConnected && (
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
            {t.integrations.telegramConnected}
          </p>
        )}

        {!isLoading && !isTelegramConnected && (
          <div className="space-y-3">
            {pendingCode && (
              <div className="space-y-1 rounded-md border bg-muted/40 p-3">
                <p className="text-center font-mono text-2xl font-semibold tracking-[0.3em] text-foreground">
                  {pendingCode}
                </p>
                <p className="text-center text-xs text-muted-foreground">{t.integrations.telegramCodeExpiry}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{t.integrations.telegramInstructions}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateCode}
              disabled={generateCode.isPending}
            >
              {generateCode.isPending ? <Loader2 className="animate-spin" /> : <MessageCircle />}
              {pendingCode ? t.integrations.telegramGenerateAnotherCode : t.integrations.telegramGenerateCode}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t.integrations.icsTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.integrations.icsDescription}</p>

        {isLoading && <Skeleton className="h-9 w-full" />}

        {!isLoading && integrations && (
          <div className="flex gap-2">
            <Input
              readOnly
              value={getIcsFeedUrl(integrations.ics_feed_token)}
              onFocus={(event) => event.target.select()}
              className="font-mono text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleCopyIcsUrl} className="shrink-0">
              {copied ? <Check /> : <Copy />}
              {t.integrations.icsCopy}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
