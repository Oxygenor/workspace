-- ============================================================
-- Qplaze/Kanboard sync: pulls cards (sourceId/title/sourceUrl
-- only) from an external Kanboard instance into one column of
-- one local board, via a separate Node/Playwright worker (no
-- official Kanboard API available). Three trigger paths (board
-- button, protected worker endpoint, 15-min schedule) all funnel
-- through the single `qplaze_sync_apply_cards` RPC below.
--
-- Every new `security definer` function here gets an explicit
-- `revoke execute` in this same migration — 0022 fixed a
-- pre-existing gap where that step was skipped, so it must not
-- be repeated here.
-- ============================================================

-- ============================================================
-- Target column: which column receives newly-synced cards. At
-- most one per board, same shape as one_reset_target_per_board.
-- ============================================================
alter table public.kanban_columns add column is_qplaze_import_column boolean not null default false;

create unique index one_qplaze_import_column_per_board on public.kanban_columns (board_id)
  where is_qplaze_import_column and archived_at is null;

-- ============================================================
-- qplaze_card_links: the dedup boundary. Only cards referenced
-- here are ever touched by sync — anything else (manually
-- created cards) is untouched by design.
--
-- card_id uses ON DELETE SET NULL, not CASCADE: if it cascaded,
-- hard-deleting a synced card would delete its link row too, and
-- the next sync would see the still-existing Kanboard task as
-- "never synced" and silently recreate it. With SET NULL, a null
-- card_id means "this was linked, the user deleted it locally —
-- never recreate," which the apply function checks for.
-- ============================================================
create table public.qplaze_card_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  card_id uuid references public.kanban_cards (id) on delete set null,
  source_id text not null,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_id)
);

create index idx_qplaze_card_links_workspace_id on public.qplaze_card_links (workspace_id);

create trigger trg_qplaze_card_links_updated_at before update on public.qplaze_card_links
  for each row execute function public.set_updated_at();

alter table public.qplaze_card_links enable row level security;

create policy "qplaze_card_links_select_members" on public.qplaze_card_links
  for select using (public.is_workspace_member(workspace_id));

-- ============================================================
-- qplaze_sync_runs: observability log. error_code is always one
-- of a fixed set of enum strings, NEVER a raw error message —
-- Playwright errors can embed page content (real card titles) in
-- their .message, so the worker must never pass those through.
-- ============================================================
create table public.qplaze_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  found_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  error_code text check (
    error_code is null or error_code in (
      'login_failed', 'captcha_detected', 'structure_changed',
      'lock_busy', 'no_target_column', 'internal'
    )
  )
);

create index idx_qplaze_sync_runs_workspace_started on public.qplaze_sync_runs (workspace_id, started_at desc);

alter table public.qplaze_sync_runs enable row level security;

create policy "qplaze_sync_runs_select_members" on public.qplaze_sync_runs
  for select using (public.is_workspace_member(workspace_id));

-- ============================================================
-- qplaze_sync_lock: single-flight lock, one row per workspace.
-- Deliberately no RLS policies at all (not even select) — this
-- is pure internal plumbing for the security-definer functions
-- below; nothing needs to read or write it directly.
-- ============================================================
create table public.qplaze_sync_lock (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  locked_at timestamptz not null,
  run_token uuid not null
);

alter table public.qplaze_sync_lock enable row level security;

-- ============================================================
-- qplaze_sync_acquire_lock: atomic compare-and-set. Must stay a
-- real SQL statement (not a supabase-js `.upsert()`) — PostgREST's
-- upsert always does an unconditional ON CONFLICT DO UPDATE and
-- has no way to express the staleness WHERE clause below; if this
-- function's logic is ever "simplified" into a client-side upsert,
-- the lock silently becomes non-atomic.
--
-- Returns the new run_token if acquired, or null if another run
-- is already in progress and not yet stale. The 10-minute
-- staleness window only recovers a crashed/hung worker — it does
-- NOT by itself prevent a stolen lock from causing a double-apply,
-- because qplaze_sync_apply_cards below checks the token still
-- matches before doing anything.
-- ============================================================
create or replace function public.qplaze_sync_acquire_lock(p_workspace_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid := gen_random_uuid();
  v_acquired uuid;
begin
  insert into public.qplaze_sync_lock (workspace_id, locked_at, run_token)
  values (p_workspace_id, now(), v_token)
  on conflict (workspace_id) do update
    set locked_at = now(), run_token = excluded.run_token
    where public.qplaze_sync_lock.locked_at < now() - interval '10 minutes'
  returning run_token into v_acquired;

  return v_acquired;
end;
$$;

revoke execute on function public.qplaze_sync_acquire_lock(uuid) from public, anon, authenticated;

create or replace function public.qplaze_sync_release_lock(p_workspace_id uuid, p_run_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.qplaze_sync_lock
  where workspace_id = p_workspace_id and run_token = p_run_token;
end;
$$;

revoke execute on function public.qplaze_sync_release_lock(uuid, uuid) from public, anon, authenticated;

-- ============================================================
-- qplaze_sync_apply_cards: the single shared "import" path used
-- identically by the board button, the manual endpoint, and the
-- scheduled cron (all three call the worker's sync.js, which
-- calls this one RPC). Never touches column_id on an existing
-- link (a manual column move is never reverted), never deletes
-- anything, never touches cards absent from qplaze_card_links.
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
  v_target_column_id uuid;
  v_target_board_id uuid;
  v_target_column_count integer;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_found integer;
  v_card jsonb;
  v_source_id text;
  v_title text;
  v_source_url text;
  v_link record;
  v_new_position numeric;
  v_new_card_id uuid;
begin
  select exists(
    select 1 from public.qplaze_sync_lock
    where workspace_id = p_workspace_id and run_token = p_run_token
  ) into v_lock_valid;

  if not v_lock_valid then
    return jsonb_build_object('error', 'superseded');
  end if;

  select kc.id, kc.board_id, count(*) over ()
    into v_target_column_id, v_target_board_id, v_target_column_count
  from public.kanban_columns kc
  join public.workspace_items wi on wi.id = kc.board_id
  where wi.workspace_id = p_workspace_id
    and kc.is_qplaze_import_column
    and kc.archived_at is null
  limit 1;

  if v_target_column_count is null or v_target_column_count <> 1 then
    return jsonb_build_object('error', 'no_target_column');
  end if;

  v_found := jsonb_array_length(p_cards);

  for v_card in select * from jsonb_array_elements(p_cards)
  loop
    v_source_id := v_card ->> 'source_id';
    v_title := v_card ->> 'title';
    v_source_url := v_card ->> 'source_url';

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
      update public.kanban_cards
      set title = v_title
      where id = v_link.card_id
        and archived_at is null
        and title is distinct from v_title;

      if found then
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

revoke execute on function public.qplaze_sync_apply_cards(uuid, uuid, jsonb) from public, anon, authenticated;
