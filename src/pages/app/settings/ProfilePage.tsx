import { useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { profileSchema, type ProfileFormValues } from '@/lib/validations/auth'
import { useAuth } from '@/features/auth/use-auth'
import { useProfile, useUpdateProfileName, useUploadAvatar } from '@/features/profile/hooks'
import { t } from '@/i18n'

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfileName = useUpdateProfileName()
  const uploadAvatar = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) })

  useEffect(() => {
    if (profile) {
      reset({ fullName: profile.full_name ?? '' })
    }
  }, [profile, reset])

  function onSubmit(values: ProfileFormValues) {
    updateProfileName.mutate(values.fullName)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      uploadAvatar.mutate(file)
    }
    event.target.value = ''
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const initials = (profile?.full_name || user?.email || '?').slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-foreground">{t.profile.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.profile.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                {t.profile.changeAvatar}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t.profile.email}</Label>
              <Input id="email" value={user?.email ?? ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">{t.profile.fullNameLabel}</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            </div>

            <Button type="submit" disabled={!isDirty || updateProfileName.isPending}>
              {updateProfileName.isPending && <Loader2 className="animate-spin" />}
              {t.profile.saveChanges}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
