'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LandingPage from '@/components/landing'
import HomePage from '@/components/home'

export default function Page() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 rounded-full border-4 border-slate-700 border-t-brand-500 mx-auto animate-spin"></div>
          <p className="text-slate-400">Loading ShowForge...</p>
        </div>
      </div>
    )
  }

  // Show appropriate page based on session
  if (session?.user) {
    return <HomePage />
  }

  return <LandingPage />
}
