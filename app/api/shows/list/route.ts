import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
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

    const shows = await prisma.show.findMany({
      where: { userId: user.id },
      include: {
        episodes: {
          include: {
            scenes: {
              include: {
                shots: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const enrichedShows = shows.map((show) => {
      const totalShots =
        show.episodes.reduce((sum, ep) => {
          return (
            sum +
            ep.scenes.reduce((sceneSum, scene) => {
              return sceneSum + scene.shots.length
            }, 0)
          )
        }, 0) || 0

      const completedShots =
        show.episodes.reduce((sum, ep) => {
          return (
            sum +
            ep.scenes.reduce((sceneSum, scene) => {
              return (
                sceneSum +
                scene.shots.filter((s) => s.status === 'complete').length
              )
            }, 0)
          )
        }, 0) || 0

      return {
        ...show,
        progress: {
          completedShots,
          totalShots,
          percentage: totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0,
        },
      }
    })

    return NextResponse.json({ shows: enrichedShows })
  } catch (error) {
    console.error('Error listing shows:', error)
    return NextResponse.json(
      { error: 'Failed to list shows' },
      { status: 500 }
    )
  }
}
