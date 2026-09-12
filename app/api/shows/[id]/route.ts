import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const show = await prisma.show.findUnique({
      where: { id: params.id },
      include: {
        storyBible: true,
        characters: {
          include: { characterAssets: true },
        },
        locations: {
          include: { locationAssets: true },
        },
        episodes: {
          include: {
            scenes: {
              include: {
                shots: {
                  include: {
                    generationJob: true,
                    mediaAsset: true,
                  },
                },
              },
            },
          },
        },
        productionJobs: true,
      },
    })

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Check authorization
    if (show.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate progress
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

    const progress =
      totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0

    return NextResponse.json({
      show: {
        ...show,
        progress: {
          completedShots,
          totalShots,
          percentage: progress,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching show:', error)
    return NextResponse.json(
      { error: 'Failed to fetch show' },
      { status: 500 }
    )
  }
}
