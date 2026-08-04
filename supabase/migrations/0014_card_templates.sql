-- ============================================================
-- Card templates: extend template_kind with 'card'. Nothing in
-- this migration inserts a 'card'-kind row, so the new enum value
-- is safe to add and use in later (separate) transactions.
-- ============================================================
alter type public.template_kind add value 'card';
