import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type { ProfileRow } from '@/types/database'

export async function fetchProfile(userId: string): Promise<ProfileRow> {
  const result = await supabase.from('profiles').select('*').eq('id', userId).single()
  return throwIfError(result, 'Не вдалося завантажити профіль.')
}

export async function updateProfileName(userId: string, fullName: string): Promise<ProfileRow> {
  const result = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося оновити профіль.')
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024

export async function uploadAvatar(userId: string, file: File): Promise<ProfileRow> {
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error('Файл завеликий. Максимальний розмір аватара — 5 МБ.')
  }

  const extension = file.name.split('.').pop() ?? 'png'
  const path = `${userId}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })

  if (uploadError) {
    throw new Error('Не вдалося завантажити аватар.')
  }

  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const result = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
    .select('*')
    .single()

  return throwIfError(result, 'Не вдалося зберегти посилання на аватар.')
}
