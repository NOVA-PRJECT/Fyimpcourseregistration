import { z } from 'zod'

const SlotRuleSchema = z.enum([
  'FIXED',
  'CAMPUS_FIXED',
  'DEPT_RESTRICTED',
  'EXCLUDE_DEPT',
  'POOL_RESTRICTED',
  'GLOBAL_BASKET',
])

const SlotSchema = z.object({
  rule: SlotRuleSchema,
  target: z.string().min(1),
  name: z.string().min(1),
})

const PathwaySchema = z.object({
  id: z.string().optional(), // server generates if missing
  name: z.string().min(1).max(100),
  slots: z.array(SlotSchema).min(1).max(10),
})

export const BlueprintUpdateSchema = z.object({
  semester: z.number().int().min(1).max(10),
  min_credits: z.number().int().min(1).default(18),
  max_credits: z.number().int().min(1).default(26),
  pathways: z.array(PathwaySchema).min(1).max(10),
}).refine(data => data.max_credits >= data.min_credits, {
  message: 'Max credits cannot be less than min credits',
  path: ['max_credits'],
})

export type BlueprintUpdateInput = z.infer<typeof BlueprintUpdateSchema>
