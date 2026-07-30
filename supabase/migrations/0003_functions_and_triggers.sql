-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger trg_workspace_items_updated_at before update on public.workspace_items
  for each row execute function public.set_updated_at();

create trigger trg_kanban_columns_updated_at before update on public.kanban_columns
  for each row execute function public.set_updated_at();

create trigger trg_kanban_cards_updated_at before update on public.kanban_cards
  for each row execute function public.set_updated_at();

create trigger trg_checklist_items_updated_at before update on public.checklist_items
  for each row execute function public.set_updated_at();

create trigger trg_comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

create trigger trg_documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create trigger trg_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger trg_calendar_events_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

create trigger trg_table_cells_updated_at before update on public.table_cells
  for each row execute function public.set_updated_at();

-- ============================================================
-- auto-assign sequential card_number per board
-- ============================================================
create or replace function public.set_card_number()
returns trigger
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.board_id::text, 0));

  select coalesce(max(card_number), 0) + 1
  into new.card_number
  from public.kanban_cards
  where board_id = new.board_id;

  return new;
end;
$$;

create trigger trg_set_card_number
  before insert on public.kanban_cards
  for each row
  when (new.card_number is null)
  execute function public.set_card_number();

-- ============================================================
-- new user bootstrap: profile + personal workspace + demo structure
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_root_id uuid;
  v_projects_id uuid;
  v_game_id uuid;
  v_board_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    null
  );

  insert into public.workspaces (id, name, owner_id)
  values (gen_random_uuid(), 'Мій Workspace', new.id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  insert into public.workspace_items (id, workspace_id, parent_id, type, name, icon, position, created_by)
  values (gen_random_uuid(), v_workspace_id, null, 'section', 'Розробка ігор', 'Gamepad2', 1000, new.id)
  returning id into v_root_id;

  insert into public.workspace_items (id, workspace_id, parent_id, type, name, icon, position, created_by)
  values (gen_random_uuid(), v_workspace_id, v_root_id, 'section', 'Проєкти', 'FolderKanban', 1000, new.id)
  returning id into v_projects_id;

  insert into public.workspace_items (id, workspace_id, parent_id, type, name, icon, position, created_by)
  values (gen_random_uuid(), v_workspace_id, v_projects_id, 'section', 'HTML5 Games', 'Folder', 1000, new.id)
  returning id into v_game_id;

  insert into public.workspace_items (id, workspace_id, parent_id, type, name, icon, position, created_by)
  values (gen_random_uuid(), v_workspace_id, v_game_id, 'kanban', 'Канбан проєктів', 'KanbanSquare', 1000, new.id)
  returning id into v_board_id;

  insert into public.kanban_columns (board_id, name, color, position) values
    (v_board_id, 'Нові', '#a855f7', 1000),
    (v_board_id, 'У роботі', '#3b82f6', 2000),
    (v_board_id, 'На тестуванні', '#f59e0b', 3000),
    (v_board_id, 'На погодженні', '#ec4899', 4000),
    (v_board_id, 'Завершено', '#22c55e', 5000);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS helper functions (security definer, owned by table owner ->
-- bypasses RLS internally, avoids recursive-policy issues)
-- ============================================================
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(p_workspace_id uuid)
returns public.member_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.workspace_members
  where workspace_id = p_workspace_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_edit_workspace(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.workspace_role(p_workspace_id) in ('owner', 'admin', 'member'), false);
$$;

create or replace function public.can_manage_workspace(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.workspace_role(p_workspace_id) in ('owner', 'admin'), false);
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.workspace_role(p_workspace_id) = 'owner', false);
$$;

create or replace function public.item_workspace_id(p_item_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id from public.workspace_items where id = p_item_id;
$$;

create or replace function public.card_workspace_id(p_card_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select wi.workspace_id
  from public.kanban_cards kc
  join public.workspace_items wi on wi.id = kc.board_id
  where kc.id = p_card_id;
$$;

create or replace function public.row_workspace_id(p_row_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select wi.workspace_id
  from public.table_rows tr
  join public.workspace_items wi on wi.id = tr.table_id
  where tr.id = p_row_id;
$$;

-- ============================================================
-- Safe reorder / reparent RPCs (security invoker: normal RLS
-- update-policies still apply to the underlying statements)
-- ============================================================
create or replace function public.move_workspace_item(
  p_item_id uuid,
  p_new_parent_id uuid,
  p_new_position numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_new_parent_type public.item_type;
  v_new_parent_workspace uuid;
begin
  select workspace_id into v_workspace_id from public.workspace_items where id = p_item_id;
  if v_workspace_id is null then
    raise exception 'item not found';
  end if;

  if p_new_parent_id is not null then
    if p_new_parent_id = p_item_id then
      raise exception 'cannot move an item into itself';
    end if;

    select type, workspace_id into v_new_parent_type, v_new_parent_workspace
    from public.workspace_items where id = p_new_parent_id;

    if v_new_parent_workspace is null or v_new_parent_workspace <> v_workspace_id then
      raise exception 'target parent must belong to the same workspace';
    end if;

    if v_new_parent_type <> 'section' then
      raise exception 'only sections can contain child items';
    end if;

    if exists (
      with recursive descendants as (
        select id from public.workspace_items where parent_id = p_item_id
        union all
        select wi.id from public.workspace_items wi
        join descendants d on wi.parent_id = d.id
      )
      select 1 from descendants where id = p_new_parent_id
    ) then
      raise exception 'cannot move a section into its own descendant';
    end if;
  end if;

  update public.workspace_items
  set parent_id = p_new_parent_id,
      position = p_new_position
  where id = p_item_id;
end;
$$;

grant execute on function public.move_workspace_item(uuid, uuid, numeric) to authenticated;

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
begin
  select board_id into v_board_id from public.kanban_cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  select board_id into v_target_board_id from public.kanban_columns where id = p_new_column_id;
  if v_target_board_id is null or v_target_board_id <> v_board_id then
    raise exception 'target column must belong to the same board';
  end if;

  update public.kanban_cards
  set column_id = p_new_column_id,
      position = p_new_position
  where id = p_card_id;
end;
$$;

grant execute on function public.move_kanban_card(uuid, uuid, numeric) to authenticated;
