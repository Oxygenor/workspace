import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/use-auth'
import { signOut } from '@/features/auth/api'
import { useProfile } from '@/features/profile/hooks'
import { t } from '@/i18n'

function initialsFrom(name: string | null | undefined, email: string | undefined) {
  const source = name?.trim() || email || '?'
  const parts = source.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function UserMenu() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t.topbar.profileMenu}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
            <AvatarFallback>{initialsFrom(profile?.full_name, user?.email)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{profile?.full_name || user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/app/settings/profile')}>
          <UserIcon />
          {t.nav.profile}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/app/settings/workspace')}>
          <Settings />
          {t.nav.workspaceSettings}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut />
          {t.auth.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
