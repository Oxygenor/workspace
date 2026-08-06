-- ============================================================
-- qplaze_sync_apply_cards now also reports which existing cards
-- had their column changed this run (title/from/to), so the
-- worker can send a Telegram notification for each — "your card
-- was moved on the Qplaze side" is only interesting information
-- if the caller knows which card and where.
-- ============================================================
create or replace function public.qplaze_sync_apply_cards(
  p_workspace_id uuid,
  p_run_token uuid,
  p_cards jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_valid boolean;
  v_mapping_count integer;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_found integer;
  v_card jsonb;
  v_source_id text;
  v_title text;
  v_source_url text;
  v_qplaze_list_id text;
  v_target_column_id uuid;
  v_target_board_id uuid;
  v_target_column_name text;
  v_link record;
  v_new_position numeric;
  v_new_card_id uuid;
  v_title_changed boolean;
  v_column_changed boolean;
  v_old_column_name text;
  v_moved jsonb := '[]'::jsonb;
begin
  select exists(
    select 1 from public.qplaze_sync_lock
    where workspace_id = p_workspace_id and run_token = p_run_token
  ) into v_lock_valid;

  if not v_lock_valid then
    return jsonb_build_object('error', 'superseded');
  end if;

  select count(*) into v_mapping_count from public.qplaze_column_map where workspace_id = p_workspace_id;
  if v_mapping_count = 0 then
    return jsonb_build_object('error', 'no_target_column');
  end if;

  v_found := jsonb_array_length(p_cards);

  for v_card in select * from jsonb_array_elements(p_cards)
  loop
    v_source_id := v_card ->> 'source_id';
    v_title := v_card ->> 'title';
    v_source_url := v_card ->> 'source_url';
    v_qplaze_list_id := v_card ->> 'qplaze_list_id';

    select cm.local_column_id, kc.board_id, kc.name
      into v_target_column_id, v_target_board_id, v_target_column_name
    from public.qplaze_column_map cm
    join public.kanban_columns kc on kc.id = cm.local_column_id
    where cm.workspace_id = p_workspace_id and cm.qplaze_list_id = v_qplaze_list_id;

    if v_target_column_id is null then
      -- No mapping for this Qplaze list (e.g. Архів) — not synced at all.
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select * into v_link
    from public.qplaze_card_links
    where workspace_id = p_workspace_id and source_id = v_source_id;

    if v_link is null then
      select coalesce(max(position), 0) + 1000 into v_new_position
      from public.kanban_cards
      where column_id = v_target_column_id and archived_at is null;

      insert into public.kanban_cards (board_id, column_id, title, position)
      values (v_target_board_id, v_target_column_id, v_title, v_new_position)
      returning id into v_new_card_id;

      insert into public.qplaze_card_links (workspace_id, card_id, source_id, source_url)
      values (p_workspace_id, v_new_card_id, v_source_id, v_source_url);

      v_created := v_created + 1;
    elsif v_link.card_id is null then
      -- Permanently dismissed: the user deleted this card locally.
      v_skipped := v_skipped + 1;
    else
      select
        kcd.title is distinct from v_title,
        kcd.column_id is distinct from v_target_column_id,
        oldcol.name
        into v_title_changed, v_column_changed, v_old_column_name
      from public.kanban_cards kcd
      join public.kanban_columns oldcol on oldcol.id = kcd.column_id
      where kcd.id = v_link.card_id and kcd.archived_at is null;

      if not found then
        -- Card was archived locally; leave it alone.
        v_skipped := v_skipped + 1;
      elsif v_title_changed or v_column_changed then
        if v_column_changed then
          select coalesce(max(position), 0) + 1000 into v_new_position
          from public.kanban_cards
          where column_id = v_target_column_id and archived_at is null;
        end if;

        update public.kanban_cards
        set title = v_title,
            column_id = v_target_column_id,
            position = case when v_column_changed then v_new_position else position end,
            column_entered_at = case when v_column_changed then now() else column_entered_at end
        where id = v_link.card_id;

        v_updated := v_updated + 1;

        if v_column_changed then
          v_moved := v_moved || jsonb_build_object(
            'title', v_title,
            'from_column', v_old_column_name,
            'to_column', v_target_column_name
          );
        end if;
      else
        v_skipped := v_skipped + 1;
      end if;

      update public.qplaze_card_links
      set source_url = v_source_url
      where id = v_link.id;
    end if;
  end loop;

  return jsonb_build_object(
    'found', v_found,
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'moved', v_moved
  );
end;
$$;

revoke execute on function public.qplaze_sync_apply_cards(uuid, uuid, jsonb) from public, anon, authenticated;
