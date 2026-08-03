-- ============================================================
-- "Done column" auto-archive: a column can be flagged as a
-- completion column with a configurable number of days after
-- which cards sitting there get archived automatically.
-- ============================================================
alter table public.kanban_columns add column is_done_column boolean not null default false;
alter table public.kanban_columns add column auto_archive_days integer not null default 7;

alter table public.kanban_cards add column column_entered_at timestamptz not null default now();

-- ============================================================
-- move_kanban_card: bump column_entered_at only when the card
-- actually switches columns (not on plain reorder within a column).
-- ============================================================
create or replace function public.move_kanban_card(
  p_card_id uuid,
  p_new_column_id uuid,
  p_new_position numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_board_id uuid;
  v_target_board_id uuid;
  v_current_column_id uuid;
begin
  select board_id, column_id into v_board_id, v_current_column_id
  from public.kanban_cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  select board_id into v_target_board_id from public.kanban_columns where id = p_new_column_id;
  if v_target_board_id is null or v_target_board_id <> v_board_id then
    raise exception 'target column must belong to the same board';
  end if;

  update public.kanban_cards
  set column_id = p_new_column_id,
      position = p_new_position,
      column_entered_at = case when p_new_column_id <> v_current_column_id then now() else column_entered_at end
  where id = p_card_id;
end;
$$;

-- ============================================================
-- Scheduled maintenance: archive cards that have been sitting in
-- a "done" column longer than that column's auto_archive_days.
-- security definer since this runs outside any user's request
-- context (invoked by pg_cron) and must bypass RLS.
-- ============================================================
create or replace function public.archive_stale_done_cards()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.kanban_cards c
  set archived_at = now()
  from public.kanban_columns col
  where col.id = c.column_id
    and c.archived_at is null
    and col.archived_at is null
    and col.is_done_column
    and c.column_entered_at <= now() - make_interval(days => col.auto_archive_days);
end;
$$;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'archive-stale-done-cards') then
    perform cron.unschedule('archive-stale-done-cards');
  end if;
end
$$;

select cron.schedule(
  'archive-stale-done-cards',
  '0 3 * * *',
  $$select public.archive_stale_done_cards();$$
);
