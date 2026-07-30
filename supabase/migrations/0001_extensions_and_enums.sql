-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'item_type') then
    create type public.item_type as enum ('section', 'kanban', 'notes', 'table', 'task_list', 'calendar');
  end if;

  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type public.priority_level as enum ('low', 'medium', 'high', 'critical');
  end if;

  if not exists (select 1 from pg_type where typname = 'table_field_type') then
    create type public.table_field_type as enum ('text', 'number', 'date', 'checkbox', 'select', 'status', 'url');
  end if;
end
$$;
