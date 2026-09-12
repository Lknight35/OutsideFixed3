import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

const SECONDS_PER_SHOT = 5

function timestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}.000`
}

/** Serves WebVTT captions timed from the episode's scene and shot structure. */
export async function GET(
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

  const episode = await prisma.episode.findUnique({
    where: { id: params.id },
    include: {
      show: { select: { userId: true } },
      scenes: {
        orderBy: { sceneNumber: 'asc' },
        include: { shots: { orderBy: { shotNumber: 'asc' } } },
      },
    },
  })

  if (!episode) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
  }
  if (episode.show.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lines = ['WEBVTT', '']
  let cursor = 0

  for (const scene of episode.scenes) {
    for (const shot of scene.shots) {
      const duration = shot.targetDurationSeconds || SECONDS_PER_SHOT
      const text = shot.dialogue?.trim() || scene.dialogue?.trim() || shot.description
      lines.push(`${timestamp(cursor)} --> ${timestamp(cursor + duration)}`)
      lines.push(text.slice(0, 120))
      lines.push('')
      cursor += duration
    }
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'private, max-age=60',
    },
  })
}
