-- ============================================================
-- "Reset target" column: a column can be flagged as where cards
-- get swept back to at the start of each workday if they were
-- left sitting in an "in progress" column (is_in_progress_column)
-- overnight. At most one reset-target column per board.
-- ============================================================
alter table public.kanban_columns add column is_reset_target_column boolean not null default false;

create unique index one_reset_target_per_board on public.kanban_columns (board_id)
  where is_reset_target_column and archived_at is null;

-- ============================================================
-- move_kanban_card: fix a regression from 0018, which replaced
-- 0012's "stop timer when card enters a done column" check with
-- "stop timer when card enters an in-progress column" instead of
-- combining both. A card's running timer should stop on entering
-- either kind of column.
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
  v_is_done_column boolean;
  v_is_in_progress_column boolean;
begin
  select board_id, column_id into v_board_id, v_current_column_id
  from public.kanban_cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  select board_id, is_done_column, is_in_progress_column
    into v_target_board_id, v_is_done_column, v_is_in_progress_column
  from public.kanban_columns where id = p_new_column_id;
  if v_target_board_id is null or v_target_board_id <> v_board_id then
    raise exception 'target column must belong to the same board';
  end if;

  update public.kanban_cards
  set column_id = p_new_column_id,
      position = p_new_position,
      column_entered_at = case when p_new_column_id <> v_current_column_id then now() else column_entered_at end
  where id = p_card_id;

  if p_new_column_id <> v_current_column_id and (v_is_done_column or v_is_in_progress_column) then
    update public.time_entries
    set ended_at = now()
    where card_id = p_card_id and ended_at is null;
  end if;
end;
$$;

-- ============================================================
-- Per-user guard so the daily reset only runs once per local day,
-- checked/updated by the card-reset edge function.
-- ============================================================
alter table public.user_schedule_settings add column last_card_reset_at timestamptz;

-- ============================================================
-- reset_in_progress_cards: move every active card sitting in one
-- of the user's "in progress" columns to that board's reset-target
-- column. Security definer + not granted to authenticated: only
-- callable via the service-role key (card-reset edge function),
-- same trust model as archive_stale_done_cards (0011).
-- ============================================================
create or replace function public.reset_in_progress_cards(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moved integer;
begin
  with user_workspaces as (
    select workspace_id from public.workspace_members where user_id = p_user_id
  ),
  boards as (
    select wi.id as board_id
    from public.workspace_items wi
    join user_workspaces uw on uw.workspace_id = wi.workspace_id
    where wi.type = 'kanban' and wi.archived_at is null
  ),
  targets as (
    select kc.board_id, kc.id as target_column_id
    from public.kanban_columns kc
    join boards b on b.board_id = kc.board_id
    where kc.is_reset_target_column and kc.archived_at is null
  ),
  sources as (
    select kc.board_id, kc.id as source_column_id
    from public.kanban_columns kc
    join boards b on b.board_id = kc.board_id
    where kc.is_in_progress_column and kc.archived_at is null
  ),
  target_max as (
    select t.target_column_id, coalesce(max(c.position), 0) as max_position
    from targets t
    left join public.kanban_cards c on c.column_id = t.target_column_id and c.archived_at is null
    group by t.target_column_id
  ),
  to_move as (
    select c.id as card_id, t.target_column_id,
           row_number() over (partition by t.target_column_id order by c.position) as rn
    from public.kanban_cards c
    join sources s on s.source_column_id = c.column_id
    join targets t on t.board_id = s.board_id
    where c.archived_at is null
  ),
  moved as (
    update public.kanban_cards c
    set column_id = tm.target_column_id,
        column_entered_at = now(),
        position = mx.max_position + tm.rn * 1000
    from to_move tm
    join target_max mx on mx.target_column_id = tm.target_column_id
    where c.id = tm.card_id
    returning c.id
  )
  select count(*) into v_moved from moved;

  return coalesce(v_moved, 0);
end;
$$;
