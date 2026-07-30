import { LoginForm } from '@/features/auth/components/LoginForm'
import { t } from '@/i18n'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">{t.auth.loginTitle}</h1>
      <LoginForm />
    </div>
  )
}
