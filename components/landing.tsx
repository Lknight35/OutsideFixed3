'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid credentials')
      setIsLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-brand-950 to-slate-950 flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="max-w-4xl text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
          ShowForge
        </h1>
        <p className="text-2xl md:text-3xl text-slate-300 mb-4">
          What do you want to watch?
        </p>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Describe it. We'll make it. Instantly generate your own movies and TV shows with AI.
        </p>
      </div>

      {/* Sign In Form */}
      <div className="w-full max-w-md">
        <div className="glass p-8 rounded-2xl">
          <h2 className="text-2xl font-bold mb-6 text-white">Get Started</h2>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-400 text-sm">
              Demo mode: Use any email and password to create an account
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mt-20 grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="text-4xl mb-3">✨</div>
          <h3 className="text-lg font-semibold text-white mb-2">Describe Your Story</h3>
          <p className="text-slate-400 text-sm">
            Tell us what you want to watch. The more detail, the better.
          </p>
        </div>
        <div className="text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-lg font-semibold text-white mb-2">AI Creates It</h3>
          <p className="text-slate-400 text-sm">
            Our AI generates the story, characters, scenes, and visuals.
          </p>
        </div>
        <div className="text-center">
          <div className="text-4xl mb-3">▶️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Watch It</h3>
          <p className="text-slate-400 text-sm">
            Stream your custom-created show instantly. No limits.
          </p>
        </div>
      </div>
    </div>
  )
}
