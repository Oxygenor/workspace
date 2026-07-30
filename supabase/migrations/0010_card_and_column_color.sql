-- ============================================================
-- Kanban cards: optional accent color (independent of labels),
-- shown as a left-border accent on the card and editable from the
-- card detail dialog. Mirrors the color already available on
-- workspace_items and kanban_columns.
-- ============================================================
alter table public.kanban_cards add column color text;
