import { z } from 'zod'

const SlotRuleSchema = z.enum([
  'FIXED',
  'DEPT_RESTRICTED',
  'EXCLUDE_DEPT',
  'POOL_RESTRICTED',
  'GLOBAL_BASKET',
  ''
]).or(z.null()).optional()

const SlotSchema = z.object({
  slot: z.number().int().min(1).max(6),
  rule: SlotRuleSchema,
  target: z.string().nullable().optional().or(z.literal('')),
  name: z.string().nullable().optional().or(z.literal('')),
})

export const BlueprintUpdateSchema = z.object({
  semester: z.number().int().min(1).max(10),
  min_credits: z.number().int().min(1).default(18),
  max_credits: z.number().int().min(1).default(26),
  slots: z.array(SlotSchema).length(6, 'Must provide exactly 6 slots'),
}).refine(data => data.max_credits >= data.min_credits, {
  message: 'Max credits cannot be less than min credits',
  path: ['max_credits'],
})

export type BlueprintUpdateInput = z.infer<typeof BlueprintUpdateSchema>
