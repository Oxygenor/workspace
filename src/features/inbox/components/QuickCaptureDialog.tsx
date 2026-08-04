import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import { useUiStore } from '@/stores/ui-store'
import { useCreateInboxItem } from '../hooks'

export function QuickCaptureDialog() {
  const open = useUiStore((s) => s.quickCaptureOpen)
  const setOpen = useUiStore((s) => s.setQuickCaptureOpen)
  const createItem = useCreateInboxItem()
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    createItem.mutate(trimmed, { onSuccess: () => setText('') })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setText('')
        setOpen(next)
      }}
    >
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t.inbox.captureTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.inbox.capturePlaceholder}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!text.trim() || createItem.isPending}>
            {createItem.isPending && <Loader2 className="animate-spin" />}
            {t.inbox.captureSave}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
