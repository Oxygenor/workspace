import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'
import { t } from '@/i18n'

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">{t.auth.resetTitle}</h1>
      <ResetPasswordForm />
    </div>
  )
}
