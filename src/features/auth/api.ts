import { supabase } from '@/lib/supabase/client'
import { toAppError } from '@/lib/supabase/errors'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw toAppError(error, 'Не вдалося увійти. Перевірте пошту та пароль.')
  return data
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
  if (error) throw toAppError(error, 'Не вдалося зареєструватися.')
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw toAppError(error, 'Не вдалося вийти.')
}

export async function sendPasswordResetEmail(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw toAppError(error, 'Не вдалося надіслати лист для відновлення пароля.')
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw toAppError(error, 'Не вдалося змінити пароль.')
}
