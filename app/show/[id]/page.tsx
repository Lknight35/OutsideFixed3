'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import ProductionStatus from '@/components/production-status'
import ShowViewer from '@/components/show-viewer'

interface Show {
  id: string
  title: string
  description: string | null
  status: string
  episodes: any[]
  progress: {
    completedShots: number
    totalShots: number
    percentage: number
  }
}

export default function ShowPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const showId = params.id as string

  const [show, setShow] = useState<Show | null>(null)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<string>('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/')
    }
  }, [sessionStatus, router])

  // Drives the production one step at a time, then refreshes the view.
  // Serverless-safe: each tick is a single bounded request, and closing the
  // tab simply pauses progress rather than losing it — state lives in the DB.
  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/shows/${showId}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setShow(data.show)

        if (data.show.status !== 'complete' && data.show.status !== 'failed') {
          const step = await fetch(`/api/shows/${showId}/advance`, {
            method: 'POST',
          })
          if (step.ok && !cancelled) {
            const result = await step.json()
            setDetail(result.detail ?? '')
          }
        }
      } catch (error) {
        console.error('Production poll failed', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    tick()
    const interval = setInterval(tick, 1200)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [showId])

  if (loading || !show) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-full border-4 border-slate-700 border-t-brand-500 mx-auto animate-spin"></div>
          <p className="text-slate-400">Loading your show...</p>
        </div>
      </div>
    )
  }

  // Show is complete, display viewer
  if (show.status === 'complete' && show.episodes.length > 0) {
    return <ShowViewer show={show} />
  }

  // Show is still generating, display production status
  return <ProductionStatus show={show} detail={detail} />
}
