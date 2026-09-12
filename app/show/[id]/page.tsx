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
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/')
    }
  }, [sessionStatus, router])

  useEffect(() => {
    fetchShow()
    const interval = setInterval(fetchShow, 3000) // Poll every 3 seconds
    setRefreshInterval(interval)
    return () => clearInterval(interval)
  }, [showId])

  const fetchShow = async () => {
    try {
      const response = await fetch(`/api/shows/${showId}`)
      if (response.ok) {
        const data = await response.json()
        setShow(data.show)
      }
    } catch (error) {
      console.error('Error fetching show:', error)
    } finally {
      setLoading(false)
    }
  }

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
  return <ProductionStatus show={show} />
}
