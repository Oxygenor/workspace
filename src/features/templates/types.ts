import type { ItemType } from '@/types/database'

export interface SectionTemplateNode {
  type: ItemType
  name: string
  icon: string | null
  color: string
  children?: SectionTemplateNode[]
}

export interface SectionTemplatePayload {
  tree: SectionTemplateNode
}

export interface ChecklistTemplatePayload {
  items: string[]
}
