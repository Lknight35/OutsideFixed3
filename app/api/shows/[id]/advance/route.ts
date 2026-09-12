import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { productionPipeline } from '@/lib/services/pipeline'

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
    select: { id: true, userId: true, status: true },
  })
  if (!show) {
    return NextResponse.json({ error: 'Show not found' }, { status: 404 })
  }
  if (show.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await productionPipeline.advance(params.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error(`[pipeline] show=${params.id} failed`, error)
    await prisma.show.update({
      where: { id: params.id },
      data: { status: 'failed' },
    })
    // Consumers see a friendly message; details stay in logs and admin tools.
    return NextResponse.json(
      { error: 'We hit a problem with this production. Retrying shortly.' },
      { status: 500 }
    )
  }
}
