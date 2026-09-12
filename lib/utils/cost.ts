import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const COST_ESTIMATES = {
  story_generation: 2.0,
  character_assets: 3.0,
  location_assets: 2.5,
  character_design: 1.5,
  scene_planning: 1.0,
  shot_video_generation: 5.0,
  shot_audio_generation: 1.0,
  dialogue_generation: 0.5,
  sound_effects: 0.5,
  music_generation: 2.0,
  assembly: 1.0,
  quality_check: 0.5,
  poster_generation: 1.0,
  subtitle_generation: 0.25,
}

export async function estimateProductionCost(
  numScenes: number,
  numShots: number,
  includeMusic: boolean = true
): Promise<number> {
  let total = 0

  // Base story generation
  total += COST_ESTIMATES.story_generation

  // Per-scene costs
  total += numScenes * COST_ESTIMATES.scene_planning

  // Per-shot costs
  total += numShots * (COST_ESTIMATES.shot_video_generation + COST_ESTIMATES.shot_audio_generation)

  // Dialogue, sound, music
  total += numShots * COST_ESTIMATES.dialogue_generation
  total += numShots * COST_ESTIMATES.sound_effects

  if (includeMusic) {
    total += COST_ESTIMATES.music_generation
  }

  // Assembly and QC
  total += COST_ESTIMATES.assembly + COST_ESTIMATES.quality_check

  // Poster and subtitles
  total += COST_ESTIMATES.poster_generation + COST_ESTIMATES.subtitle_generation

  return total
}

export async function reserveCredits(
  userId: string,
  amount: number,
  description: string
): Promise<boolean> {
  // Check if user has enough credits
  const balance = await getUserCreditBalance(userId)
  if (balance < amount) {
    return false
  }

  // Reserve credits
  await prisma.creditLedger.create({
    data: {
      userId,
      type: 'reserve',
      amount,
      description,
    },
  })

  return true
}

export async function consumeCredits(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  await prisma.creditLedger.create({
    data: {
      userId,
      type: 'consume',
      amount,
      description,
    },
  })
}

export async function refundCredits(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  await prisma.creditLedger.create({
    data: {
      userId,
      type: 'refund',
      amount,
      description,
    },
  })
}

export async function grantCredits(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  await prisma.creditLedger.create({
    data: {
      userId,
      type: 'grant',
      amount,
      description,
    },
  })
}

export async function getUserCreditBalance(userId: string): Promise<number> {
  const ledger = await prisma.creditLedger.findMany({
    where: { userId },
  })

  let balance = 100 // Free tier gets 100 credits initially
  for (const entry of ledger) {
    if (entry.type === 'grant' || entry.type === 'refund') {
      balance += entry.amount
    } else if (entry.type === 'consume' || entry.type === 'reserve') {
      balance -= entry.amount
    }
  }

  return balance
}

export async function logProviderRequest(
  userId: string,
  provider: string,
  endpoint: string | undefined,
  request: any,
  response: any | undefined,
  error: string | undefined = undefined,
  durationMs?: number
): Promise<void> {
  await prisma.providerRequest.create({
    data: {
      userId,
      provider,
      endpoint,
      request,
      response,
      error,
      status: error ? 'error' : 'success',
      durationMs,
    },
  })
}

export async function recordUsage(
  userId: string,
  operation: string,
  provider: string,
  estimatedCost: number,
  actualCost?: number,
  metadata?: {
    inputUnits?: number
    outputUnits?: number
    secondsGenerated?: number
  }
): Promise<void> {
  await prisma.usageRecord.create({
    data: {
      userId,
      operation,
      provider,
      estimatedCost,
      actualCost,
      inputUnits: metadata?.inputUnits,
      outputUnits: metadata?.outputUnits,
      secondsGenerated: metadata?.secondsGenerated,
    },
  })
}

export async function getProductionCostSummary(showId: string) {
  const costs = await prisma.productionCost.findMany({
    where: { showId },
  })

  const summary = {
    totalEstimated: 0,
    totalActual: 0,
    byComponent: {} as Record<string, { estimated: number; actual: number }>,
  }

  for (const cost of costs) {
    summary.totalEstimated += cost.estimatedCost
    if (cost.actualCost) {
      summary.totalActual += cost.actualCost
    }

    if (!summary.byComponent[cost.component]) {
      summary.byComponent[cost.component] = { estimated: 0, actual: 0 }
    }
    summary.byComponent[cost.component].estimated += cost.estimatedCost
    if (cost.actualCost) {
      summary.byComponent[cost.component].actual += cost.actualCost
    }
  }

  return summary
}
