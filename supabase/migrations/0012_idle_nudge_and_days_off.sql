-- ============================================================
-- user_schedule_settings: per-user work hours / break / idle-nudge
-- preferences, used by the idle-nudge and telegram-digest edge
-- functions to decide when it's OK to notify.
-- ============================================================
create table public.user_schedule_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  work_start time not null default '10:00',
  work_end time not null default '19:00',
  break_start time default '14:00',
  break_end time default '15:00',
  timezone text not null default 'Europe/Kyiv',
  idle_nudge_enabled boolean not null default true,
  last_idle_nudge_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_schedule_settings_updated_at before update on public.user_schedule_settings
  for each row execute function public.set_updated_at();

alter table public.user_schedule_settings enable row level security;

create policy "user_schedule_settings_select_own" on public.user_schedule_settings
  for select using (user_id = auth.uid());

create policy "user_schedule_settings_insert_own" on public.user_schedule_settings
  for insert with check (user_id = auth.uid());

create policy "user_schedule_settings_update_own" on public.user_schedule_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- user_days_off: recurring weekday rules (e.g. every Saturday)
-- plus one-off date exceptions (either marking an otherwise
-- working day off, or a normally-off day as working).
-- ============================================================
create table public.user_days_off (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint check (weekday between 0 and 6),
  specific_date date,
  is_working boolean not null default false,
  created_at timestamptz not null default now(),
  constraint user_days_off_single_target check (num_nonnulls(weekday, specific_date) = 1)
);

-- Plain (non-partial) unique indexes: Postgres treats NULLs as distinct for
-- uniqueness, so weekday rows (specific_date null) and specific_date rows
-- (weekday null) never collide with each other here. Non-partial also lets
-- the client `upsert(..., { onConflict: 'user_id,specific_date' })` target
-- this index directly without needing a matching WHERE predicate.
create unique index idx_user_days_off_weekday on public.user_days_off (user_id, weekday);
create unique index idx_user_days_off_specific_date on public.user_days_off (user_id, specific_date);

alter table public.user_days_off enable row level security;

create policy "user_days_off_select_own" on public.user_days_off
  for select using (user_id = auth.uid());

create policy "user_days_off_insert_own" on public.user_days_off
  for insert with check (user_id = auth.uid());

-- Needed for `upsert(..., { onConflict: 'user_id,specific_date' })` when
-- re-editing an existing date exception (its ON CONFLICT DO UPDATE path
-- is checked against the UPDATE policy, not just INSERT).
create policy "user_days_off_update_own" on public.user_days_off
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "user_days_off_delete_own" on public.user_days_off
  for delete using (user_id = auth.uid());

-- ============================================================
-- Signup bootstrap: default schedule row + default weekends off,
-- same shape as handle_new_user_integrations (0008).
-- ============================================================
create or replace function public.handle_new_user_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_schedule_settings (user_id) values (new.id);
  insert into public.user_days_off (user_id, weekday, is_working) values
    (new.id, 0, false),
    (new.id, 6, false);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_schedule on auth.users;
create trigger on_auth_user_created_schedule
  after insert on auth.users
  for each row execute function public.handle_new_user_schedule();

-- Backfill for any users created before this migration.
insert into public.user_schedule_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.user_days_off (user_id, weekday, is_working)
select id, weekday, false
from auth.users, (values (0), (6)) as weekends (weekday)
on conflict do nothing;

-- ============================================================
-- move_kanban_card: also stop the card's running timer when it's
-- dragged into a "done" column.
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
begin
  select board_id, column_id into v_board_id, v_current_column_id
  from public.kanban_cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  select board_id, is_done_column into v_target_board_id, v_is_done_column
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
end;
$$;
