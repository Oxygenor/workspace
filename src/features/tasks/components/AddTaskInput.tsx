import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddTaskInputProps {
  placeholder: string
  autoFocus?: boolean
  onSubmit: (title: string) => void
  onCancel?: () => void
}

export function AddTaskInput({ placeholder, autoFocus, onSubmit, onCancel }: AddTaskInputProps) {
  const [value, setValue] = useState('')

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
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
  )
}
