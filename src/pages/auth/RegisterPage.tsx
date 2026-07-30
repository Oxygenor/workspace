import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { t } from '@/i18n'

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">{t.auth.registerTitle}</h1>
      <RegisterForm />
    </div>
  )
}
