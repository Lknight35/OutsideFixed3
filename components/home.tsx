'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

interface Show {
  id: string
  title: string
  description: string | null
  posterUrl: string | null
  status: string
  createdAt: string
  episodes: any[]
  progress: {
    completedShots: number
    totalShots: number
    percentage: number
  }
}

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShows()
  }, [])

  const fetchShows = async () => {
    try {
      const response = await fetch('/api/shows/list')
      if (response.ok) {
        const data = await response.json()
        setShows(data.shows)
      }
    } catch (error) {
      console.error('Error fetching shows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    router.push('/create')
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">ShowForge</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">{session?.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="btn btn-secondary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Create New Button */}
        <div className="mb-12">
          <button
            onClick={handleCreateNew}
            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-semibold transition-all inline-flex items-center gap-2"
          >
            <span>+</span>
            Create New Show
          </button>
        </div>

        {/* Shows Grid */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">Your Shows</h2>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-shimmer h-80"></div>
              ))}
            </div>
          ) : shows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No shows yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shows.map((show) => (
                <Link key={show.id} href={`/show/${show.id}`}>
                  <div className="card hover:border-brand-500 cursor-pointer transition-all h-full">
                    {show.posterUrl && (
                      <div className="mb-4 h-40 bg-slate-800 rounded-lg overflow-hidden">
                        <img
                          src={show.posterUrl}
                          alt={show.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-white mb-2">{show.title}</h3>
                    {show.description && (
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {show.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">
                          {show.progress.completedShots} / {show.progress.totalShots} shots
                        </span>
                        <span className="text-xs font-semibold text-brand-400">
                          {show.progress.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 transition-all duration-300"
                          style={{ width: `${show.progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                      {show.episodes.length} episode{show.episodes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
