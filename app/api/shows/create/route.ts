import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { showRunner } from '@/lib/services/showrunner'
import { validateStoryRequest, moderateStoryRequest, validateLimits } from '@/lib/utils/validation'
import { estimateProductionCost, reserveCredits } from '@/lib/utils/cost'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request
    const body = await request.json()
    const validation = await validateStoryRequest(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.errors },
        { status: 400 }
      )
    }

    // Validate and moderate content
    const moderation = await moderateStoryRequest(validation.data!.description)
    if (!moderation.isAllowed) {
      return NextResponse.json(
        {
          error: 'Content not allowed',
          reasons: moderation.reasons,
        },
        { status: 400 }
      )
    }

    // Estimate cost
    const estimatedCost = await estimateProductionCost(
      10, // Assume 10 scenes for initial estimate
      20 // Assume 20 shots
    )

    // Validate limits
    const limitCheck = validateLimits(
      validation.data!.advancedOptions?.runtime || 300,
      20,
      estimatedCost
    )

    if (!limitCheck.valid) {
      return NextResponse.json(
        {
          error: 'Limits exceeded',
          violations: limitCheck.violations,
        },
        { status: 400 }
      )
    }

    // Reserve credits
    const reserved = await reserveCredits(
      user.id,
      estimatedCost,
      `Production of ${validation.data!.description.substring(0, 50)}`
    )

    if (!reserved) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      )
    }

    // Create show
    const showId = await showRunner.createShowFromRequest(user.id, {
      userDescription: validation.data!.description,
      advancedOptions: validation.data!.advancedOptions,
    })

    // Record production cost
    await prisma.productionCost.create({
      data: {
        showId,
        userId: user.id,
        component: 'total',
        estimatedCost,
        reserved: true,
      },
    })

    return NextResponse.json(
      {
        showId,
        message: 'Show creation started',
        estimatedCost,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating show:', error)
    return NextResponse.json(
      { error: 'Failed to create show', details: String(error) },
      { status: 500 }
    )
  }
}
