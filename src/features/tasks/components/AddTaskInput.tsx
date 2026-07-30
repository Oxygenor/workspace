import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateKey, parseDatePhrase } from '@/lib/parse-date-phrase'
import { t } from '@/i18n'

interface AddTaskInputProps {
  placeholder: string
  autoFocus?: boolean
  onSubmit: (title: string, dueDate?: string | null) => void
  onCancel?: () => void
}

export function AddTaskInput({ placeholder, autoFocus, onSubmit, onCancel }: AddTaskInputProps) {
  const [value, setValue] = useState('')

  const detectedDate = useMemo(() => parseDatePhrase(value).date, [value])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    const { cleanedText, date } = parseDatePhrase(trimmed)
    const title = cleanedText || trimmed
    onSubmit(title, date ? formatDateKey(date) : null)
    setValue('')
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') {
              setValue('')
              onCancel?.()
            }
          }}
        />
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={submit}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {detectedDate && <p className="mt-1 pl-1 text-xs text-muted-foreground">{t.quickAdd.dateDetectedHint}</p>}
    </div>
  )
}
