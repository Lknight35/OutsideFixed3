'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactPlayer from 'react-player'

interface ShowViewerProps {
  show: {
    id: string
    title: string
    description: string | null
    episodes: any[]
  }
}

export default function ShowViewer({ show }: ShowViewerProps) {
  const router = useRouter()
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)

  if (!show.episodes.length) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No episodes available</p>
          <button
            onClick={() => router.back()}
            className="btn btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentEpisode = show.episodes[currentEpisodeIndex]
  const episodeTitle = currentEpisode?.title || `Episode ${currentEpisodeIndex + 1}`

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Video Player */}
      <div className="bg-black">
        <div className="max-w-6xl mx-auto aspect-video bg-black relative">
          {currentEpisode?.videoUrl ? (
            <ReactPlayer
              url={currentEpisode.videoUrl}
              playing={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls
              width="100%"
              height="100%"
              config={{
                file: {
                  attributes: {
                    controlsList: 'nodownload',
                  },
                },
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-slate-400">Video loading...</p>
            </div>
          )}
        </div>
      </div>

      {/* Episode Info */}
      <div className="max-w-6xl mx-auto px-4 py-8 border-b border-slate-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{show.title}</h1>
            <h2 className="text-xl text-slate-300">
              Episode {currentEpisodeIndex + 1}: {episodeTitle}
            </h2>
            {currentEpisode?.description && (
              <p className="text-slate-400 mt-3">{currentEpisode.description}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 flex-wrap">
          {currentEpisodeIndex > 0 && (
            <button
              onClick={() => setCurrentEpisodeIndex(currentEpisodeIndex - 1)}
              className="btn btn-secondary"
            >
              ← Previous Episode
            </button>
          )}

          {currentEpisodeIndex < show.episodes.length - 1 && (
            <button
              onClick={() => setCurrentEpisodeIndex(currentEpisodeIndex + 1)}
              className="btn btn-secondary"
            >
              Next Episode →
            </button>
          )}

          {currentEpisodeIndex === show.episodes.length - 1 && (
            <button
              onClick={() => router.push(`/show/${show.id}/continue`)}
              className="btn btn-primary"
            >
              Generate Next Episode
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="btn btn-outline"
          >
            Back to Library
          </button>
        </div>
      </div>

      {/* Episodes List */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h3 className="text-xl font-bold text-white mb-4">Episodes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {show.episodes.map((episode, index) => (
            <button
              key={episode.id}
              onClick={() => setCurrentEpisodeIndex(index)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                index === currentEpisodeIndex
                  ? 'border-brand-500 bg-brand-900/30'
                  : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
              }`}
            >
              <p className="font-semibold text-white">Episode {index + 1}</p>
              <p className="text-sm text-slate-400">{episode.title}</p>
              <p className="text-xs text-slate-500 mt-2">
                {episode.runtimeSeconds}s
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
