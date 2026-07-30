import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type { ProfileRow, WorkspaceMemberRow, WorkspaceRow } from '@/types/database'

export interface WorkspaceMemberWithProfile extends WorkspaceMemberRow {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

export async function fetchMyWorkspaces(): Promise<WorkspaceRow[]> {
  // RLS on `workspaces` already restricts rows to workspaces the current
  // user is a member of (see public.is_workspace_member in migrations).
  const result = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити список Workspace.')
}

export async function fetchWorkspace(workspaceId: string): Promise<WorkspaceRow> {
  const result = await supabase.from('workspaces').select('*').eq('id', workspaceId).single()
  return throwIfError(result, 'Не вдалося завантажити Workspace.')
}

export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
  const membersResult = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  const members = throwIfError(membersResult, 'Не вдалося завантажити учасників Workspace.')

  if (members.length === 0) return []

  const profilesResult = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', members.map((m) => m.user_id))
  const profiles = throwIfError(profilesResult, 'Не вдалося завантажити профілі учасників.')
  const profileById = new Map(profiles.map((p) => [p.id, p]))

  return members.map((member) => ({ ...member, profile: profileById.get(member.user_id) ?? null }))
}

export async function renameWorkspace(workspaceId: string, name: string): Promise<WorkspaceRow> {
  const result = await supabase
    .from('workspaces')
    .update({ name })
    .eq('id', workspaceId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося перейменувати Workspace.')
}
