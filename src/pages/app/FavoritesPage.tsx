import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveIcon } from '@/lib/modules/icon-map'
import { useFavorites } from '@/features/favorites/hooks'
import { useWorkspaceItems } from '@/features/workspace-tree/hooks'
import { t } from '@/i18n'

export default function FavoritesPage() {
  const { data: favorites, isLoading: favoritesLoading } = useFavorites()
  const { data: items, isLoading: itemsLoading } = useWorkspaceItems()
  const navigate = useNavigate()

  const isLoading = favoritesLoading || itemsLoading
  const favoriteItems = (favorites ?? [])
    .map((f) => items?.find((i) => i.id === f.item_id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-foreground">{t.favorites.title}</h1>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && favoriteItems.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Star className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">{t.favorites.empty}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {favoriteItems.map((item) => {
          const Icon = resolveIcon(item.icon, item.type)
          return (
            <Card
              key={item.id}
              className="flex cursor-pointer flex-row items-center gap-3 p-4 transition-shadow hover:shadow-md"
              onClick={() => navigate(`/app/item/${item.id}`)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
              <Star className="ml-auto h-4 w-4 shrink-0 fill-primary text-primary" />
            </Card>
          )
        })}
      </div>
    </div>
  )
}
