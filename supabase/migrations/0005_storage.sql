-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do nothing;

-- ============================================================
-- avatars: public read, owner (folder = own user id) can write/delete
-- expected object path: <user_id>/<filename>
-- ============================================================
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- attachments: private, scoped to workspace members
-- expected object path: <workspace_id>/<card_id or item_id>/<filename>
-- ============================================================
create policy "attachments_members_read" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_editors_insert" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and public.can_edit_workspace(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments_owner_or_manager_delete" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (
      owner = auth.uid()
      or public.can_manage_workspace(((storage.foldername(name))[1])::uuid)
    )
  );
