import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Обов’язкове поле').email('Некоректна електронна пошта'),
  password: z.string().min(1, 'Обов’язкове поле'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Мінімум 2 символи').max(80, 'Максимум 80 символів'),
    email: z.string().min(1, 'Обов’язкове поле').email('Некоректна електронна пошта'),
    password: z.string().min(8, 'Мінімум 8 символів'),
    confirmPassword: z.string().min(1, 'Обов’язкове поле'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Обов’язкове поле').email('Некоректна електронна пошта'),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Мінімум 8 символів'),
    confirmPassword: z.string().min(1, 'Обов’язкове поле'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Мінімум 2 символи').max(80, 'Максимум 80 символів'),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
