import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type { ActivityLogRow, ProfileRow } from '@/types/database'

export interface ActivityWithActor extends ActivityLogRow {
  actor: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

export async function fetchRecentActivity(workspaceId: string, limit = 15): Promise<ActivityWithActor[]> {
  const result = await supabase
    .from('activity_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = throwIfError(result, 'Не вдалося завантажити активність.')

  if (rows.length === 0) return []

  const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))]
  if (userIds.length === 0) return rows.map((r) => ({ ...r, actor: null }))

  const profilesResult = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
  const profiles = throwIfError(profilesResult, 'Не вдалося завантажити авторів активності.')
  const profileById = new Map(profiles.map((p) => [p.id, p]))

  return rows.map((r) => ({ ...r, actor: r.user_id ? profileById.get(r.user_id) ?? null : null }))
}
