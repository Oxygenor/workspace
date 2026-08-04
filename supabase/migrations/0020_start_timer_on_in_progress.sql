-- ============================================================
-- move_kanban_card: entering an "in progress" column now STARTS
-- (not stops) the card's timer — reversing 0018/0019's behavior.
-- Real-world use showed the previous "stop on entry" behavior
-- fought idle-nudge: moving a card into "В роботі" (the literal
-- act of starting work on it) killed the running timer, so 30
-- minutes later idle-nudge falsely reported idleness. The
-- done-column branch (stop timer) is unchanged.
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
  v_workspace_id uuid;
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

  if p_new_column_id <> v_current_column_id and v_is_done_column then
    update public.time_entries
    set ended_at = now()
    where card_id = p_card_id and ended_at is null;
  end if;

  if p_new_column_id <> v_current_column_id and v_is_in_progress_column then
    select workspace_id into v_workspace_id from public.workspace_items where id = v_target_board_id;

    -- Mirrors the manual start-timer semantics in src/features/time/api.ts:
    -- stop whatever else is running for this user (another card, a task, or
    -- nothing), then start — or leave running — a timer for this card.
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
  end if;
end;
$$;
