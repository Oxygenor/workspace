-- Subtasks: self-referencing parent on `tasks` (needed for the task-list
-- module's "підзадачі" requirement, not covered by the flat `tasks` table).
alter table public.tasks add column parent_task_id uuid references public.tasks (id) on delete cascade;
create index idx_tasks_parent_task_id on public.tasks (parent_task_id);

-- Simple text labels for tasks (kept as an array instead of a full
-- normalized join table like kanban's labels, since task labels are
-- lightweight, per-task tags with no board-level color/reuse needs).
alter table public.tasks add column labels text[] not null default '{}';

-- Calendar events: link to a section/item (in addition to a kanban card)
-- and an optional reminder, both required by the calendar module spec.
alter table public.calendar_events add column related_item_id uuid references public.workspace_items (id) on delete set null;
alter table public.calendar_events add column reminder_minutes_before integer;
create index idx_calendar_events_related_item_id on public.calendar_events (related_item_id);
