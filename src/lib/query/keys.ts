export const queryKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,

  workspaces: () => ['workspaces'] as const,
  workspace: (workspaceId: string | undefined) => ['workspace', workspaceId] as const,
  workspaceMembers: (workspaceId: string | undefined) => ['workspace-members', workspaceId] as const,

  workspaceItems: (workspaceId: string | undefined) => ['workspace-items', workspaceId] as const,
  workspaceItem: (itemId: string | undefined) => ['workspace-item', itemId] as const,

  favorites: (workspaceId: string | undefined) => ['favorites', workspaceId] as const,

  kanbanColumns: (boardId: string | undefined) => ['kanban-columns', boardId] as const,
  kanbanCards: (boardId: string | undefined) => ['kanban-cards', boardId] as const,
  kanbanCard: (cardId: string | undefined) => ['kanban-card', cardId] as const,
  cardChecklist: (cardId: string | undefined) => ['card-checklist', cardId] as const,
  cardComments: (cardId: string | undefined) => ['card-comments', cardId] as const,
  cardAttachments: (cardId: string | undefined) => ['card-attachments', cardId] as const,
  cardAssignees: (cardId: string | undefined) => ['card-assignees', cardId] as const,
  cardLabels: (cardId: string | undefined) => ['card-labels', cardId] as const,
  boardLabels: (boardId: string | undefined) => ['board-labels', boardId] as const,

  document: (itemId: string | undefined) => ['document', itemId] as const,

  tableColumns: (tableId: string | undefined) => ['table-columns', tableId] as const,
  tableRows: (tableId: string | undefined) => ['table-rows', tableId] as const,
  tableCells: (tableId: string | undefined) => ['table-cells', tableId] as const,

  tasks: (taskListId: string | undefined) => ['tasks', taskListId] as const,

  calendarEvents: (calendarId: string | undefined) => ['calendar-events', calendarId] as const,
  deadlineCards: () => ['deadline-cards'] as const,
  deadlineTasks: () => ['deadline-tasks'] as const,

  activityLog: (workspaceId: string | undefined) => ['activity-log', workspaceId] as const,

  search: (workspaceId: string | undefined, query: string) => ['search', workspaceId, query] as const,
}
