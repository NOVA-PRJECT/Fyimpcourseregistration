import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
})

export type LoginInput = z.infer<typeof LoginSchema>