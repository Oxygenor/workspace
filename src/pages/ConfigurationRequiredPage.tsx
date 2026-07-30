import { TriangleAlert } from 'lucide-react'

export default function ConfigurationRequiredPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/40 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="h-6 w-6" />
      </span>
      <h1 className="text-lg font-semibold text-foreground">Потрібне налаштування Supabase</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Змінні середовища <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_URL</code> та{' '}
        <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> не задані. Скопіюйте{' '}
        <code className="rounded bg-muted px-1 py-0.5">.env.example</code> у{' '}
        <code className="rounded bg-muted px-1 py-0.5">.env</code>, вкажіть значення з вашого проєкту Supabase та
        перезапустіть застосунок. Деталі — у README.
      </p>
    </div>
  )
}
