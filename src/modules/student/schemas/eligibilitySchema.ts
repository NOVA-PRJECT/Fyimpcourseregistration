import { z } from 'zod'

export const EligibilitySchema = z.object({
  cap_number: z.string().min(1, 'CAP number is required'),
  dob: z.string().min(1, 'Date of birth is required'),
})

export const VerifySchema = z.object({
  cap_number: z.string().min(1, 'CAP number is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export type EligibilityInput = z.infer<typeof EligibilitySchema>
export type VerifyInput = z.infer<typeof VerifySchema>