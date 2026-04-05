import { z } from 'zod'

export const CampusSettingsSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']),
  deadline: z.string().min(1, 'Deadline is required'),
  min_credits: z.number().int().positive().optional(),
  max_credits: z.number().int().positive().optional(),
})

export type CampusSettingsInput = z.infer<typeof CampusSettingsSchema>