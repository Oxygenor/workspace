import { t } from '@/i18n'
import { useTreeData } from '../tree-context'
import { DropGap } from './DropGap'
import { TreeNode } from './TreeNode'

interface TreeLevelProps {
  parentId: string | null
  depth: number
}

export function TreeLevel({ parentId, depth }: TreeLevelProps) {
  const { childrenMap } = useTreeData()
  const children = childrenMap.get(parentId) ?? []

  if (children.length === 0) {
    return (
      <div style={{ marginLeft: depth * 12 }} className="flex h-7 items-center pl-10 text-xs italic text-muted-foreground">
        {t.tree.emptyChildren}
      </div>
    )
  }

  return (
    <div>
      <DropGap parentId={parentId} before={null} after={children[0]} depth={depth} />
      {children.map((child, index) => (
        <div key={child.id}>
          <TreeNode item={child} depth={depth} />
          {/* No trailing gap after the last child — dropping directly on a section's own row
              already appends to the end of its children, so a gap here would just be a
              redundant drop target that visually stacks with the same gap at every ancestor
              level whose last (possibly nested) descendant is currently expanded. */}
          {index < children.length - 1 && (
            <DropGap parentId={parentId} before={child} after={children[index + 1]} depth={depth} />
          )}
        </div>
      ))}
    </div>
  )
}
