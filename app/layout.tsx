import type { Metadata } from 'next'
import '../styles/globals.css'
import Providers from '@/components/providers'

export const metadata: Metadata = {
  title: 'ShowForge - Create Your Own Show',
  description: 'Describe what you want to watch. We\'ll make it.',
  generator: 'Next.js',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
