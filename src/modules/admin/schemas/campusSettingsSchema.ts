import { z } from 'zod'

export const CampusSettingsSchema = z.object({
  deadline: z.string().min(1, 'Deadline is required').max(50),
  academic_year: z.string().min(4).max(9).optional(),
})

export type CampusSettingsInput = z.infer<typeof CampusSettingsSchema>