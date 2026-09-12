import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Check for admin token (for demo, just check if API_TOKEN env var is set)
    const token = request.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = {
      users: await prisma.user.count(),
      shows: await prisma.show.count(),
      episodes: await prisma.episode.count(),
      characters: await prisma.character.count(),
      generationJobs: await prisma.generationJob.count(),
      generationJobsByStatus: await prisma.generationJob.groupBy({
        by: ['status'],
        _count: true,
      }),
      totalCost: (
        await prisma.productionCost.aggregate({
          _sum: { estimatedCost: true },
        })
      )._sum.estimatedCost || 0,
      recentErrors: await prisma.generationJob.findMany({
        where: { status: 'failed' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          jobType: true,
          error: true,
          createdAt: true,
        },
      }),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting stats:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
