import { z } from 'zod'

export const itemNameSchema = z.object({
  name: z.string().trim().min(1, 'Назва не може бути порожньою').max(120, 'Максимум 120 символів'),
})

export type ItemNameFormValues = z.infer<typeof itemNameSchema>
