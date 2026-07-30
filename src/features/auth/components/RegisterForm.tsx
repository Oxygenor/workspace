import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth'
import { signUp } from '@/features/auth/api'
import { t } from '@/i18n'

export function RegisterForm() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null)
    try {
      const data = await signUp(values.email, values.password, values.fullName)
      if (data.session) {
        navigate('/app/home', { replace: true })
      } else {
        setConfirmationSent(true)
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.common.unknownError)
    }
  }

  if (confirmationSent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Ми надіслали лист із підтвердженням на вашу пошту. Перейдіть за посиланням у листі, щоб завершити реєстрацію.
        </p>
        <Link to="/login" className="text-primary hover:underline">
          {t.auth.backToLogin}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="fullName">{t.auth.fullName}</Label>
        <Input id="fullName" autoComplete="name" {...register('fullName')} />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        {t.auth.register}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{' '}
        <Link to="/login" className="text-primary hover:underline">
          {t.auth.login}
        </Link>
      </p>
    </form>
  )
}
