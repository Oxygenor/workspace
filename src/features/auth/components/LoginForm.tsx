import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'
import { signIn } from '@/features/auth/api'
import { t } from '@/i18n'

export function LoginForm() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
      navigate('/app/home', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.common.unknownError)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            {t.auth.forgotPassword}
          </Link>
        </div>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        {t.auth.login}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{' '}
        <Link to="/register" className="text-primary hover:underline">
          {t.auth.register}
        </Link>
      </p>
    </form>
  )
}
