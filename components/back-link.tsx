'use client'

import Link from 'next/link'

export default function BackLink() {
  return (
    <Link href="/" className="text-slate-400 hover:text-white transition-colors">
      ← Back
    </Link>
  )
}
