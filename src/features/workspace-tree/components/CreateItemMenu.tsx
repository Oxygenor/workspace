import type { ReactNode } from 'react'
import { Calendar, FileText, FolderPlus, KanbanSquare, LayoutTemplate, ListTodo, Table } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTemplates } from '@/features/templates/hooks'
import type { TemplateRow } from '@/types/database'
import type { ItemType } from '@/types/database'
import { t } from '@/i18n'

const MENU_ITEMS: { type: ItemType; label: string; icon: typeof FolderPlus }[] = [
  { type: 'section', label: t.create.section, icon: FolderPlus },
  { type: 'kanban', label: t.create.kanban, icon: KanbanSquare },
  { type: 'notes', label: t.create.notes, icon: FileText },
  { type: 'table', label: t.create.table, icon: Table },
  { type: 'task_list', label: t.create.taskList, icon: ListTodo },
  { type: 'calendar', label: t.create.calendar, icon: Calendar },
]

interface CreateItemMenuProps {
  children: ReactNode
  onSelect: (type: ItemType) => void
  align?: 'start' | 'end' | 'center'
  onOpenChange?: (open: boolean) => void
  /** When provided, adds a "Створити з шаблону" submenu listing saved section templates. */
  onSelectTemplate?: (template: TemplateRow) => void
}

export function CreateItemMenu({ children, onSelect, align = 'start', onOpenChange, onSelectTemplate }: CreateItemMenuProps) {
  const { data: templates } = useTemplates('section')
  const showTemplates = Boolean(onSelectTemplate)

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>{t.create.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MENU_ITEMS.map(({ type, label, icon: Icon }) => (
          <DropdownMenuItem key={type} onSelect={() => onSelect(type)}>
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
        {showTemplates && (templates?.length ?? 0) > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LayoutTemplate />
                {t.templates.createFromTemplate}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {templates?.map((template) => (
                  <DropdownMenuItem key={template.id} onSelect={() => onSelectTemplate?.(template)}>
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
