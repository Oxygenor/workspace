import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/i18n'

interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  defaultName?: string
  isSaving?: boolean
  onSave: (name: string) => void
}

export function SaveTemplateDialog({ open, onOpenChange, title, defaultName = '', isSaving, onSave }: SaveTemplateDialogProps) {
  const [name, setName] = useState(defaultName)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setName(defaultName)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="template-name">{t.common.name}</Label>
            <Input
              id="template-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.templates.namePlaceholder}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || isSaving}>
              {isSaving && <Loader2 className="animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
