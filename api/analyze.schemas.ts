
import { z } from 'zod'

export const MAX_MESSAGE_LENGTH = 12000

export const bodySchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
})

export const resultSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high', 'inconclusive']),
  summary: z.string().min(1).max(600),
  warningSigns: z.array(
    z.object({
      signal: z.string(),
      evidence: z.string(),
      explanation: z.string(),
    }),
  ).max(8),
  reassuringSigns: z.array(z.string()).max(5),
  recommendedActions: z.array(z.string()).min(1).max(6),
  uncertainty: z.string().min(1).max(500),
})
