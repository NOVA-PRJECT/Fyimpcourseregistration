import { z } from 'zod'

export const CampusSettingsSchema = z.object({
  deadline: z.string().min(1, 'Deadline is required').max(50),
  academic_year: z.string().min(4).max(9).optional(),
  min_credits: z.number().int().min(0).max(50).optional(),
  max_credits: z.number().int().min(1).max(50).optional(),
})

export type CampusSettingsInput = z.infer<typeof CampusSettingsSchema>