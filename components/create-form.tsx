'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateForm() {
  const [description, setDescription] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [advanced, setAdvanced] = useState({
    format: 'series' as const,
    genre: [] as string[],
    setting: '',
    timePeriod: '',
    tone: '',
    visualStyle: '',
    runtime: 300,
    numCharacters: 3,
    violence: 'mild' as const,
    comedy: 'none' as const,
    romance: 'none' as const,
    pacing: 'moderate' as const,
    ending: 'surprise' as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/shows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          advancedOptions: showAdvanced ? advanced : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create show')
        return
      }

      // Redirect to production screen
      router.push(`/show/${data.showId}`)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Description */}
        <div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: Create a gritty 1990s crime drama about two detectives investigating organized crime in Miami. Serious tone, realistic dialogue, cinematic photography, unexpected ending."
            className="w-full px-6 py-4 rounded-lg bg-slate-900/50 border-2 border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 min-h-40 resize-none"
            required
          />
          <p className="text-slate-400 text-sm mt-2">
            Minimum 10 characters. Be as specific or vague as you like.
          </p>
        </div>

        {/* Advanced Options Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-brand-400 hover:text-brand-300 font-medium text-sm flex items-center gap-2"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            Advanced Controls (Optional)
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/30 p-6 rounded-lg border border-slate-800">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Format</label>
              <select
                value={advanced.format}
                onChange={(e) => setAdvanced({ ...advanced, format: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="movie">Movie</option>
                <option value="series">Series</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tone</label>
              <input
                type="text"
                value={advanced.tone}
                onChange={(e) => setAdvanced({ ...advanced, tone: e.target.value })}
                placeholder="e.g., noir, dramatic, comedic"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Setting</label>
              <input
                type="text"
                value={advanced.setting}
                onChange={(e) => setAdvanced({ ...advanced, setting: e.target.value })}
                placeholder="e.g., Miami, 1990s"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Time Period</label>
              <input
                type="text"
                value={advanced.timePeriod}
                onChange={(e) => setAdvanced({ ...advanced, timePeriod: e.target.value })}
                placeholder="e.g., 1990s, 2085"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Visual Style</label>
              <input
                type="text"
                value={advanced.visualStyle}
                onChange={(e) => setAdvanced({ ...advanced, visualStyle: e.target.value })}
                placeholder="e.g., cinematic, neon, vintage"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Pacing</label>
              <select
                value={advanced.pacing}
                onChange={(e) => setAdvanced({ ...advanced, pacing: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="slow">Slow</option>
                <option value="moderate">Moderate</option>
                <option value="fast">Fast</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ending</label>
              <select
                value={advanced.ending}
                onChange={(e) => setAdvanced({ ...advanced, ending: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="happy">Happy</option>
                <option value="dark">Dark</option>
                <option value="bittersweet">Bittersweet</option>
                <option value="twist">Twist</option>
                <option value="surprise">Surprise Me</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Runtime (seconds)</label>
              <input
                type="number"
                value={advanced.runtime}
                onChange={(e) => setAdvanced({ ...advanced, runtime: parseInt(e.target.value) })}
                min="30"
                max="600"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Violence Level</label>
              <select
                value={advanced.violence}
                onChange={(e) => setAdvanced({ ...advanced, violence: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="none">None</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="graphic">Graphic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Comedy Level</label>
              <select
                value={advanced.comedy}
                onChange={(e) => setAdvanced({ ...advanced, comedy: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="none">None</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={isLoading || description.length < 10}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Creating your show...' : 'Create My Show'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDescription('')
              setShowAdvanced(false)
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            Clear
          </button>
        </div>

        <p className="text-center text-slate-400 text-sm">
          ✨ Generating your show typically takes 2-5 minutes
        </p>
      </form>
    </div>
  )
}
