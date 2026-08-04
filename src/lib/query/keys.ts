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
  cardLabels: (cardId: string | undefined) => ['card-labels', cardId] as const,
  cardDependencies: (boardId: string | undefined) => ['card-dependencies', boardId] as const,
  boardLabels: (boardId: string | undefined) => ['board-labels', boardId] as const,

  document: (itemId: string | undefined) => ['document', itemId] as const,
  backlinks: (itemId: string | undefined) => ['backlinks', itemId] as const,

  tableColumns: (tableId: string | undefined) => ['table-columns', tableId] as const,
  tableRows: (tableId: string | undefined) => ['table-rows', tableId] as const,
  tableCells: (tableId: string | undefined) => ['table-cells', tableId] as const,

  tasks: (taskListId: string | undefined) => ['tasks', taskListId] as const,
  taskDependencies: (taskListId: string | undefined) => ['task-dependencies', taskListId] as const,

  calendarEvents: (calendarId: string | undefined) => ['calendar-events', calendarId] as const,
  deadlineCards: () => ['deadline-cards'] as const,
  deadlineTasks: () => ['deadline-tasks'] as const,

  activityLog: (workspaceId: string | undefined) => ['activity-log', workspaceId] as const,

  search: (workspaceId: string | undefined, query: string) => ['search', workspaceId, query] as const,

  tags: (workspaceId: string | undefined) => ['tags', workspaceId] as const,
  tagLinks: (targetId: string | undefined) => ['tag-links', targetId] as const,
  tagDetail: (tagId: string | undefined) => ['tag-detail', tagId] as const,

  timelineEntries: (relevantItemIds: string[]) => ['timeline-entries', ...relevantItemIds] as const,

  runningTimer: (userId: string | undefined) => ['running-timer', userId] as const,
  timeEntries: (cardId: string | undefined, taskId: string | undefined) =>
    ['time-entries', cardId ?? null, taskId ?? null] as const,
  timeEntriesTotal: (cardId: string | undefined, taskId: string | undefined) =>
    ['time-entries-total', cardId ?? null, taskId ?? null] as const,

  userIntegrations: (userId: string | undefined) => ['user-integrations', userId] as const,

  scheduleSettings: (userId: string | undefined) => ['schedule-settings', userId] as const,
  daysOff: (userId: string | undefined) => ['days-off', userId] as const,
}
