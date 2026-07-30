import type { ModuleComponentProps } from '@/lib/modules/registry'
import { TableGrid } from '../components/TableGrid'

export function TablePage({ item }: ModuleComponentProps) {
  return (
    <div className="space-y-4">
      <TableGrid tableId={item.id} />
    </div>
  )
}
