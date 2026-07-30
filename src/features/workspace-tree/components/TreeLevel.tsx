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
    return <DropGap parentId={parentId} before={null} after={null} depth={depth} />
  }

  return (
    <div>
      <DropGap parentId={parentId} before={null} after={children[0]} depth={depth} />
      {children.map((child, index) => (
        <div key={child.id}>
          <TreeNode item={child} depth={depth} />
          <DropGap parentId={parentId} before={child} after={children[index + 1] ?? null} depth={depth} />
        </div>
      ))}
    </div>
  )
}
