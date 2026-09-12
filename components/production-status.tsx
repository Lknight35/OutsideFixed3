'use client'

import { useMemo } from 'react'

const PRODUCTION_STAGES = [
  { id: 'validate', label: 'Validating your request' },
  { id: 'moderate', label: 'Content safety check' },
  { id: 'estimate', label: 'Estimating production cost' },
  { id: 'story', label: 'Dreaming up your story' },
  { id: 'characters', label: 'Creating characters' },
  { id: 'locations', label: 'Designing locations' },
  { id: 'scenes', label: 'Planning scenes' },
  { id: 'video', label: 'Filming your production' },
  { id: 'audio', label: 'Recording dialogue & sound' },
  { id: 'assembly', label: 'Editing your episode' },
  { id: 'qc', label: 'Quality check' },
  { id: 'complete', label: 'Finalizing' },
]

interface ProductionStatusProps {
  show: {
    id: string
    title: string
    status: string
    episodes: any[]
    progress: {
      completedShots: number
      totalShots: number
      percentage: number
    }
  }
}

export default function ProductionStatus({ show }: ProductionStatusProps) {
  const currentStageIndex = useMemo(() => {
    return PRODUCTION_STAGES.findIndex((s) => s.id === show.status)
  }, [show.status])

  const overallProgress = useMemo(() => {
    if (currentStageIndex === -1) return 10
    const baseProgress = ((currentStageIndex + 1) / PRODUCTION_STAGES.length) * 80
    const shotProgress = (show.progress.percentage / 100) * 20
    return Math.min(Math.round(baseProgress + shotProgress), 100)
  }, [currentStageIndex, show.progress.percentage])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-brand-950 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Show Info */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">{show.title}</h1>
          <p className="text-slate-400">Your show is being created...</p>
        </div>

        {/* Main Progress Circle */}
        <div className="flex justify-center mb-12">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#334155"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeDasharray={`${(overallProgress / 100) * (90 * 2 * Math.PI)} ${90 * 2 * Math.PI}`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9d4edd" />
                  <stop offset="100%" stopColor="#7b2cbf" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-white">{overallProgress}%</div>
              <div className="text-xs text-slate-400 mt-1">Complete</div>
            </div>
          </div>
        </div>

        {/* Current Stage */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-brand-400 mb-2">
            {PRODUCTION_STAGES[Math.max(0, Math.min(currentStageIndex, PRODUCTION_STAGES.length - 1))]?.label}
          </h2>
          {show.progress.totalShots > 0 && (
            <p className="text-slate-400">
              {show.progress.completedShots} / {show.progress.totalShots} shots completed
            </p>
          )}
        </div>

        {/* Stage List */}
        <div className="space-y-3">
          {PRODUCTION_STAGES.map((stage, index) => {
            const isCompleted = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            const isUpcoming = index > currentStageIndex

            return (
              <div
                key={stage.id}
                className={`p-4 rounded-lg flex items-center gap-4 transition-all ${
                  isCompleted
                    ? 'bg-brand-900/30 border border-brand-500/30'
                    : isCurrent
                      ? 'bg-brand-900/50 border border-brand-500/50'
                      : 'bg-slate-800/30 border border-slate-700/30'
                }`}
              >
                {/* Indicator */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full border-2 border-brand-500 animate-pulse"></div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-700"></div>
                  )}
                </div>

                {/* Label */}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>

                {/* Animated dots for current stage */}
                {isCurrent && (
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></span>
                    <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Tips */}
        <div className="mt-12 p-6 bg-slate-900/50 rounded-lg border border-slate-800">
          <p className="text-slate-300 text-sm">
            💡 <strong>Tip:</strong> You can close this window and come back later. Your show will continue generating in the background.
          </p>
        </div>
      </div>
    </div>
  )
}
