import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth } from '../../contexts/auth'

export const Route = createFileRoute('/candidate/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: CandidateDashboard,
})

function CandidateDashboard() {
  const { session, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Career OS — Candidate</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session?.user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-8">Build your capability profile and view matches.</p>
        <div className="grid grid-cols-3 gap-4">
          {['Profile status', 'Matches', 'Pending actions'].map((label) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">—</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
