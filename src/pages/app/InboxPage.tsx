import { format, parseISO } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale'
import { Inbox as InboxIcon, KanbanSquare, ListChecks, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import {
  useConvertInboxItemToCard,
  useConvertInboxItemToTask,
  useDeleteInboxItem,
  useInboxItems,
} from '@/features/inbox/hooks'
import { t } from '@/i18n'

export default function InboxPage() {
  const { data: items, isLoading } = useInboxItems()
  const { data: workspaceItems } = useWorkspaceItems()
  const convertToCard = useConvertInboxItemToCard()
  const convertToTask = useConvertInboxItemToTask()
  const deleteItem = useDeleteInboxItem()

  const boards = (workspaceItems ?? []).filter((item) => item.type === 'kanban')
  const taskLists = (workspaceItems ?? []).filter((item) => item.type === 'task_list')

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <InboxIcon className="h-5 w-5" />
        <h1 className="text-xl font-semibold text-foreground">{t.inbox.pageTitle}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{t.inbox.pageSubtitle}</p>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isLoading && (items?.length ?? 0) === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.inbox.empty}
        </p>
      )}

      <div className="space-y-2">
        {items?.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{item.text}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(item.created_at), 'd MMM, HH:mm', { locale: ukLocale })}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {t.inbox.convert}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <KanbanSquare className="h-3.5 w-3.5" />
                    {t.inbox.convertToCard}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {boards.length === 0 && <DropdownMenuItem disabled>{t.inbox.noBoards}</DropdownMenuItem>}
                      {boards.map((board) => (
                        <DropdownMenuItem
                          key={board.id}
                          onSelect={() => convertToCard.mutate({ item, boardId: board.id })}
                        >
                          {board.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ListChecks className="h-3.5 w-3.5" />
                    {t.inbox.convertToTask}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {taskLists.length === 0 && <DropdownMenuItem disabled>{t.inbox.noTaskLists}</DropdownMenuItem>}
                      {taskLists.map((list) => (
                        <DropdownMenuItem
                          key={list.id}
                          onSelect={() => convertToTask.mutate({ item, taskListId: list.id })}
                        >
                          {list.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => deleteItem.mutate(item.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.common.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  )
}
