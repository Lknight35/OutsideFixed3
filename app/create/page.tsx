'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import CreateForm from '@/components/create-form'

export default function CreatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-full border-4 border-slate-700 border-t-brand-500 mx-auto animate-spin"></div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-brand-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            What do you want to watch?
          </h1>
          <p className="text-slate-400 text-lg">
            Describe your show. Be specific or let us surprise you.
          </p>
        </div>

        <CreateForm />
      </main>
    </div>
  )
}
