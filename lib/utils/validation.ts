import { z } from 'zod'

export const StoryCreationRequestSchema = z.object({
  description: z.string().min(10).max(5000),
  advancedOptions: z
    .object({
      format: z.enum(['movie', 'series', 'short']).optional(),
      genre: z.array(z.string()).optional(),
      setting: z.string().optional(),
      timePeriod: z.string().optional(),
      tone: z.string().optional(),
      visualStyle: z.string().optional(),
      runtime: z.number().optional(),
      numCharacters: z.number().optional(),
      violence: z.enum(['none', 'mild', 'moderate', 'graphic']).optional(),
      comedy: z.enum(['none', 'light', 'moderate', 'heavy']).optional(),
      romance: z.enum(['none', 'subplot', 'central']).optional(),
      pacing: z.enum(['slow', 'moderate', 'fast']).optional(),
      ending: z.enum(['happy', 'dark', 'bittersweet', 'twist', 'surprise']).optional(),
    })
    .optional(),
})

export type StoryCreationRequest = z.infer<typeof StoryCreationRequestSchema>

// Content moderation schema
export const ModerationSchema = z.object({
  isAllowed: z.boolean(),
  reasons: z.array(z.string()).optional(),
  severity: z.enum(['allowed', 'warning', 'blocked']),
})

export type ModerationResult = z.infer<typeof ModerationSchema>

export async function validateStoryRequest(
  request: unknown
): Promise<{ valid: boolean; data?: StoryCreationRequest; errors?: string[] }> {
  try {
    const data = StoryCreationRequestSchema.parse(request)
    return { valid: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      }
    }
    return { valid: false, errors: ['Unknown validation error'] }
  }
}

export async function moderateStoryRequest(
  userDescription: string
): Promise<ModerationResult> {
  // Basic content moderation (can be enhanced with external APIs)
  const blockedWords = ['bomb', 'kill', 'destroy', 'harm']
  const lowerDescription = userDescription.toLowerCase()

  for (const word of blockedWords) {
    if (lowerDescription.includes(word)) {
      return {
        isAllowed: false,
        reasons: [`Contains restricted word: ${word}`],
        severity: 'blocked',
      }
    }
  }

  return {
    isAllowed: true,
    severity: 'allowed',
  }
}

export const CONFIG_LIMITS = {
  maxEpisodeSeconds: parseInt(process.env.MAX_EPISODE_SECONDS || '300'),
  maxShots: parseInt(process.env.MAX_SHOTS || '20'),
  maxShotRetries: parseInt(process.env.MAX_SHOT_RETRIES || '3'),
  maxProductionCost: parseInt(process.env.MAX_PRODUCTION_COST || '50'),
  maxConcurrentProductions: parseInt(process.env.MAX_CONCURRENT_PRODUCTIONS || '5'),
  maxUserDailyCost: parseInt(process.env.MAX_USER_DAILY_COST || '100'),
  generationTimeoutMs: parseInt(process.env.GENERATION_TIMEOUT_MS || '600000'),
}

export function validateLimits(
  episodeSeconds: number,
  numShots: number,
  estimatedCost: number
): { valid: boolean; violations: string[] } {
  const violations: string[] = []

  if (episodeSeconds > CONFIG_LIMITS.maxEpisodeSeconds) {
    violations.push(
      `Episode duration ${episodeSeconds}s exceeds maximum ${CONFIG_LIMITS.maxEpisodeSeconds}s`
    )
  }

  if (numShots > CONFIG_LIMITS.maxShots) {
    violations.push(`Number of shots ${numShots} exceeds maximum ${CONFIG_LIMITS.maxShots}`)
  }

  if (estimatedCost > CONFIG_LIMITS.maxProductionCost) {
    violations.push(
      `Estimated cost $${estimatedCost} exceeds maximum $${CONFIG_LIMITS.maxProductionCost}`
    )
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}
