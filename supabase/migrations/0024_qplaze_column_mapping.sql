-- ============================================================
-- Qplaze sync v2: only cards assigned to the logging-in Qplaze
-- user are synced (filtered worker-side, before this RPC ever
-- sees them), and each card's LOCAL column now mirrors its
-- CURRENT Qplaze list via an explicit mapping table — including
-- on every subsequent sync, overriding a manual local move. This
-- supersedes 0023's single "is_qplaze_import_column" model (one
-- fixed destination column for all new cards, column never
-- touched again after creation).
-- ============================================================

-- ============================================================
-- qplaze_column_map: which local column a given Qplaze list's
-- cards land in / get moved to. A Qplaze list absent from this
-- table is intentionally not synced at all (e.g. Qplaze's own
-- "Архів" list) — no special-case flag needed, just no mapping.
-- Multiple Qplaze lists may map to the same local column.
-- ============================================================
create table public.qplaze_column_map (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  qplaze_list_id text not null,
  local_column_id uuid not null references public.kanban_columns (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, qplaze_list_id)
);

create index idx_qplaze_column_map_workspace_id on public.qplaze_column_map (workspace_id);

alter table public.qplaze_column_map enable row level security;

create policy "qplaze_column_map_select_members" on public.qplaze_column_map
  for select using (public.is_workspace_member(workspace_id));

-- Seeded mapping for the "Kanban Qplaze" board, agreed with the user:
--   Incoming (7)            -> Нові
--   In progress (8)         -> У роботі
--   Code verification (80)  -> На тесті
--   On the test (9)         -> На тесті
--   For approval (10)       -> Завершено
--   Архів (12)              -> (no row — intentionally unsynced)
-- No UI exists yet to edit this; adjust via SQL until one is built.
insert into public.qplaze_column_map (workspace_id, qplaze_list_id, local_column_id) values
  ('36d0e0fc-3d44-4ee7-aa86-e9550d39c89f', '7',  'b139f8e1-fbfa-42c6-a332-65bf7ede186f'),
  ('36d0e0fc-3d44-4ee7-aa86-e9550d39c89f', '8',  '1299b971-fa17-41a9-9e26-b2e13ca9052c'),
  ('36d0e0fc-3d44-4ee7-aa86-e9550d39c89f', '80', 'f75e1412-c76a-4d78-a389-5f79bc0cd249'),
  ('36d0e0fc-3d44-4ee7-aa86-e9550d39c89f', '9',  'f75e1412-c76a-4d78-a389-5f79bc0cd249'),
  ('36d0e0fc-3d44-4ee7-aa86-e9550d39c89f', '10', '92818bae-1814-4f13-bfd9-9d241d808f14');

-- ============================================================
-- The single fixed "import column" concept is superseded by the
-- per-list mapping above — drop it rather than leave dead schema
-- and a now-meaningless UI toggle around.
-- ============================================================
drop index if exists one_qplaze_import_column_per_board;
alter table public.kanban_columns drop column if exists is_qplaze_import_column;

-- ============================================================
-- qplaze_sync_apply_cards: now takes a qplaze_list_id per card
-- and looks up its target column fresh on every run — an
-- existing linked card's column_id is updated (not just left
-- alone) whenever its mapped column differs from where it
-- currently sits, mirroring a manual move on the Qplaze side.
-- A card whose list has no mapping row is skipped entirely,
-- both for creation and for updates.
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
  v_link record;
  v_new_position numeric;
  v_new_card_id uuid;
  v_title_changed boolean;
  v_column_changed boolean;
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

    select cm.local_column_id, kc.board_id
      into v_target_column_id, v_target_board_id
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
        title is distinct from v_title,
        column_id is distinct from v_target_column_id
        into v_title_changed, v_column_changed
      from public.kanban_cards
      where id = v_link.card_id and archived_at is null;

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
    'skipped', v_skipped
  );
end;
$$;

-- Same signature as 0023 so the earlier REVOKE already applies, but
-- re-asserting explicitly rather than relying on that carrying over silently.
revoke execute on function public.qplaze_sync_apply_cards(uuid, uuid, jsonb) from public, anon, authenticated;
