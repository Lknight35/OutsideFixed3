import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CreateForm from '@/components/create-form'
import BackLink from '@/components/back-link'

export default async function CreatePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-brand-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <BackLink />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            What do you want to watch?
          </h1>
          <p className="text-slate-400 text-lg">
            Describe your show. Be specific, or let us surprise you.
          </p>
        </div>

        <CreateForm />
      </main>
    </div>
  )
}
