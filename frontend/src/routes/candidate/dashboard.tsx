import { createFileRoute, redirect, Link } from '@tanstack/react-router'
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
        <span className="font-semibold text-gray-900">Career OS</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session?.user.email}</span>
          <button type="button" onClick={signOut} className="text-sm text-gray-600 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-8">What would you like to do?</p>
        <div className="grid grid-cols-1 gap-4">
          <Link to="/candidate/profile/setup"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-sm transition-all block">
            <p className="font-medium text-gray-900 mb-1">Build / update my profile</p>
            <p className="text-sm text-gray-400">Add your education, skills, and career intent so we can accurately represent your capabilities.</p>
          </Link>
          <Link to="/candidate/profile/capability"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-sm transition-all block">
            <p className="font-medium text-gray-900 mb-1">View my capability profile</p>
            <p className="text-sm text-gray-400">See how the platform reads your skills, confidence levels, and trajectory signal.</p>
          </Link>
          <Link to="/candidate/matches"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-sm transition-all block">
            <p className="font-medium text-gray-900 mb-1">View my matches</p>
            <p className="text-sm text-gray-400">See employers who want to connect and decide whether to engage.</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
