-- ============================================================
-- "In progress" column: a column can be flagged as the active
-- work column. Moving a card into it stops that card's running
-- timer (if any), same as pressing the manual Stop button.
-- ============================================================
alter table public.kanban_columns add column is_in_progress_column boolean not null default false;

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
  v_target_stops_timer boolean;
begin
  select board_id, column_id into v_board_id, v_current_column_id
  from public.kanban_cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  select board_id, is_in_progress_column into v_target_board_id, v_target_stops_timer
  from public.kanban_columns where id = p_new_column_id;
  if v_target_board_id is null or v_target_board_id <> v_board_id then
    raise exception 'target column must belong to the same board';
  end if;

  update public.kanban_cards
  set column_id = p_new_column_id,
      position = p_new_position,
      column_entered_at = case when p_new_column_id <> v_current_column_id then now() else column_entered_at end
  where id = p_card_id;

  if p_new_column_id <> v_current_column_id and v_target_stops_timer then
    update public.time_entries
    set ended_at = now()
    where card_id = p_card_id and ended_at is null;
  end if;
end;
$$;
