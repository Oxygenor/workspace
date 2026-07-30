import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/query/keys'
import { useAuth } from '@/features/auth/use-auth'
import { fetchProfile, updateProfileName, uploadAvatar } from './api'

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.profile(user?.id),
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useUpdateProfileName() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fullName: string) => updateProfileName(user!.id, fullName),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(user?.id), profile)
      toast.success('Профіль оновлено')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUploadAvatar() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(user!.id, file),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(user?.id), profile)
      toast.success('Аватар оновлено')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
