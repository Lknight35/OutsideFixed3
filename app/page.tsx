import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import LandingPage from '@/components/landing'
import HomePage from '@/components/home'

// Resolved on the server so the correct view is the first paint — no spinner,
// and no flash of the signed-out hero for signed-in users.
export default async function Page() {
  const session = await getServerSession(authOptions)
  return session?.user ? <HomePage /> : <LandingPage />
}
