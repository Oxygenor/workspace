-- ============================================================
-- Pomodoro breaks currently exist only in client-side Zustand state
-- (no time_entries row while on break), so idle-nudge has no way to
-- distinguish a legitimate break from genuine idleness. The client
-- pushes the break's end time here so the server-side check can see it.
-- ============================================================
alter table public.user_schedule_settings add column pomodoro_break_until timestamptz;
