-- ============================================================
-- move_kanban_card: unify timer handling around a single rule —
-- a card's timer runs only while it sits in an "in progress"
-- column. Moving IN starts it (0020's behavior, unchanged);
-- moving OUT to ANY other column (done, reset-target/"Вхідні",
-- or a plain column) now stops it. Previously only entering a
-- done column stopped the timer, so moving a card with a running
-- timer to e.g. "Вхідні" left the timer ticking indefinitely.
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
  v_is_in_progress_column boolean;
  v_workspace_id uuid;
begin
  select board_id, column_id into v_board_id, v_current_column_id
  from public.kanban_cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  select board_id, is_in_progress_column into v_target_board_id, v_is_in_progress_column
  from public.kanban_columns where id = p_new_column_id;
  if v_target_board_id is null or v_target_board_id <> v_board_id then
    raise exception 'target column must belong to the same board';
  end if;

  update public.kanban_cards
  set column_id = p_new_column_id,
      position = p_new_position,
      column_entered_at = case when p_new_column_id <> v_current_column_id then now() else column_entered_at end
  where id = p_card_id;

  if p_new_column_id <> v_current_column_id then
    if v_is_in_progress_column then
      select workspace_id into v_workspace_id from public.workspace_items where id = v_target_board_id;

      -- Mirrors the manual start-timer semantics in src/features/time/api.ts:
      -- stop whatever else is running for this user, then start — or leave
      -- running — a timer for this card.
      update public.time_entries
      set ended_at = now()
      where user_id = auth.uid()
        and ended_at is null
        and card_id is distinct from p_card_id;

      insert into public.time_entries (workspace_id, user_id, card_id, ended_at)
      select v_workspace_id, auth.uid(), p_card_id, null
      where not exists (
        select 1 from public.time_entries
        where user_id = auth.uid() and card_id = p_card_id and ended_at is null
      );
    else
      update public.time_entries
      set ended_at = now()
      where card_id = p_card_id and ended_at is null;
    end if;
  end if;
end;
$$;

-- ============================================================
-- reset_in_progress_cards: the daily sweep moves cards directly
-- with a batched UPDATE (not via move_kanban_card), so it needs
-- the same "leaving in-progress stops the timer" fix applied
-- separately — otherwise a card auto-returned to "Вхідні" at the
-- start of the day keeps a forgotten timer running indefinitely.
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
  ),
  stopped_timers as (
    update public.time_entries te
    set ended_at = now()
    where te.ended_at is null
      and te.user_id = p_user_id
      and te.card_id in (select id from moved)
    returning te.id
  )
  select count(*) into v_moved from moved;

  return coalesce(v_moved, 0);
end;
$$;
