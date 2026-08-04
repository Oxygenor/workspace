-- ============================================================
-- /pause <minutes> Telegram command: temporarily silence idle-nudge
-- without touching the idle_nudge_enabled toggle.
-- ============================================================
alter table public.user_schedule_settings add column idle_nudge_paused_until timestamptz;
