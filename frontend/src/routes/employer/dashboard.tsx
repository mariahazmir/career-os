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

function StatusBadge({ status }: { status: string }) {
  const known = ['draft', 'active', 'paused', 'filled', 'closed']
  const cls = known.includes(status) ? `cos-status cos-status-${status}` : 'cos-status cos-status-draft'
  return <span className={cls}>{status}</span>
}

function EmployerDashboard() {
  const { session, signOut } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Role[]>('/role').then(setRoles).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="cos-page">
      <div className="cos-aurora" />
      <div className="cos-layer">
        <header className="cos-appbar">
          <div className="cos-brand">
            <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
            Career<span className="cos-brand-sub">OS</span>
          </div>
          <div className="flex-1" />
          <span className="text-[13px] text-[var(--tx-mute)]">{session?.user.email}</span>
          <button type="button" onClick={signOut} className="cos-btn-ghost text-[13px] px-4 py-2">
            Sign out
          </button>
        </header>

        <main className="max-w-[900px] mx-auto px-8 pb-20 pt-5">
          <div className="flex items-start justify-between gap-4 mb-9">
            <div>
              <div className="cos-eyebrow-orange mb-3">Employer</div>
              <h1 className="cos-h1 m-0">Roles</h1>
              <p className="text-[14px] text-[var(--tx-dim)] mt-2">Define a role to start finding matched talent.</p>
            </div>
            <Link to="/employer/role/new" className="cos-btn-orange mt-5">
              + Define a role
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="cos-card h-[72px]" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="cos-card-dashed p-16 text-center">
              <p className="text-[14px] text-[var(--tx-dim)]">No roles yet.</p>
              <Link to="/employer/role/new" className="inline-block mt-3 text-[var(--orange)] text-[14px] no-underline hover:underline">
                Define your first role →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {roles.map((role) => {
                const hasMap = role.role_capability_map && role.role_capability_map.length > 0
                return (
                  <div key={role.id} className="cos-card flex items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-[var(--tx)] mb-1">{role.title}</p>
                        <p className="text-[12px] text-[var(--tx-mute)]">
                          Created {new Date(role.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <StatusBadge status={role.status} />
                    </div>
                    {hasMap ? (
                      <Link to="/employer/role/$roleId/pool" params={{ roleId: role.id }} className="cos-btn-link text-[var(--teal)]">
                        View pool →
                      </Link>
                    ) : (
                      <Link to="/employer/role/$roleId/capability-map" params={{ roleId: role.id }} className="cos-btn-link">
                        Review map →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
