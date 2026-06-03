import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/auth'
import { api } from '../../lib/api'

export const Route = createFileRoute('/employer/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: EmployerDashboard,
})

interface Role {
  id: string
  title: string
  status: string
  created_at: string
  role_capability_map: Array<{ id: string }> | null
}

function EmployerDashboard() {
  const { session, signOut } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Role[]>('/role').then(setRoles).catch(console.error).finally(() => setLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-amber-100 text-amber-700',
    filled: 'bg-blue-100 text-blue-700',
    closed: 'bg-red-100 text-red-600',
  }

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

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
            <p className="text-sm text-gray-500 mt-1">Define a role to start finding matched talent.</p>
          </div>
          <Link
            to="/employer/role/new"
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Define a role
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm">No roles yet.</p>
            <Link to="/employer/role/new" className="mt-3 inline-block text-indigo-600 text-sm hover:underline">
              Define your first role →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => {
              const hasMap = role.role_capability_map && role.role_capability_map.length > 0
              return (
                <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{role.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {new Date(role.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[role.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {role.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasMap ? (
                      <Link
                        to="/employer/role/$roleId/pool"
                        params={{ roleId: role.id }}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        View pool
                      </Link>
                    ) : (
                      <Link
                        to="/employer/role/$roleId/capability-map"
                        params={{ roleId: role.id }}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Review map
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
