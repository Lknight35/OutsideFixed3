import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { showRunner } from '@/lib/services/showrunner'
import { estimateProductionCost, reserveCredits } from '@/lib/utils/cost'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const show = await prisma.show.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  })
  if (!show) {
    return NextResponse.json({ error: 'Show not found' }, { status: 404 })
  }
  if (show.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const estimatedCost = await estimateProductionCost(3, 6)
  const reserved = await reserveCredits(
    user.id,
    estimatedCost,
    `Next episode of show ${show.id}`
  )
  if (!reserved) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
  }

  try {
    const episodeId = await showRunner.createNextEpisode(params.id)
    return NextResponse.json({ episodeId }, { status: 201 })
  } catch (error) {
    console.error(`[episodes] show=${params.id} failed`, error)
    return NextResponse.json(
      { error: 'We could not start the next episode. Please try again.' },
      { status: 500 }
    )
  }
}
