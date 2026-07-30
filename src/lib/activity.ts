import { supabase } from '@/lib/supabase/client'

export type ActivityAction = 'created' | 'renamed' | 'archived' | 'restored' | 'deleted' | 'moved' | 'moved_card'

/**
 * Fire-and-forget activity logging. Never throws — a logging failure must
 * not surface as a user-facing error or roll back the action it describes.
 */
export function logActivity(
  workspaceId: string | undefined,
  userId: string | undefined,
  entityType: string,
  entityId: string | null,
  action: ActivityAction,
  metadata: Record<string, unknown> = {},
): void {
  if (!workspaceId || !userId) return
  supabase
    .from('activity_log')
    .insert({ workspace_id: workspaceId, user_id: userId, entity_type: entityType, entity_id: entityId, action, metadata })
    .then(({ error }) => {
      if (error) console.error('Не вдалося записати активність:', error.message)
    })
}
