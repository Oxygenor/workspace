import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'
import { t } from '@/i18n'

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">{t.auth.forgotTitle}</h1>
      <ForgotPasswordForm />
    </div>
  )
}
