import type { ItemType, PriorityLevel } from '@/types/database'

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

export interface CardTemplatePayload {
  title?: string
  checklistItems?: string[]
  labelIds?: string[]
  priority?: PriorityLevel
}
