import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

interface ReengageNotification {
  id: string
  gap_delta: Array<{ dimension_name: string; delta: number }>
  created_at: string
  outreach_message: { draft_text: string } | null
  original_match: {
    id: string
    role: { title: string; employer: { company_name: string } }
  } | null
}

export const Route = createFileRoute('/candidate/matches/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: MatchesPage,
})

interface MatchNotification {
  id: string
  overall_score: number
  underemployment_surfaced: boolean
  created_at: string
  match_explanation: Array<{ candidate_facing_text: string }>
  role: Array<{
    title: string
    employer: Array<{ company_name: string; industry: string | null }>
  }>
}

function MatchesPage() {
  const [matches, setMatches] = useState<MatchNotification[]>([])
  const [reengages, setReengages] = useState<ReengageNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<MatchNotification[]>('/candidate/matches'),
      api.get<ReengageNotification[]>('/reengage/candidate').catch(() => [] as ReengageNotification[]),
    ])
      .then(([matchData, reengageData]) => {
        setMatches(matchData)
        setReengages(reengageData)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Career OS</span>
        <div className="flex items-center gap-4">
          <Link to="/candidate/profile/capability" className="text-sm text-gray-500 hover:text-gray-900">My profile</Link>
          <Link to="/candidate/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Your matches</h1>
        <p className="text-sm text-gray-500 mb-6">Employers who found you through Career OS and want to connect.</p>

        {!loading && reengages.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Employers who came back</h2>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{reengages.length}</span>
            </div>
            <div className="space-y-3">
              {reengages.map((r) => {
                const match = Array.isArray(r.original_match) ? r.original_match[0] : r.original_match
                const role = Array.isArray(match?.role) ? match!.role[0] : match?.role
                const employer = Array.isArray(role?.employer) ? role!.employer[0] : role?.employer
                const topImproved = r.gap_delta
                  .sort((a, b) => b.delta - a.delta)
                  .slice(0, 2)
                  .map((g) => g.dimension_name)

                return (
                  <Link
                    key={r.id}
                    to="/candidate/reengage/$reengageId"
                    params={{ reengageId: r.id }}
                    className="block bg-white border border-indigo-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-gray-900">{role?.title ?? 'Role'}</span>
                          <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                            They came back
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{employer?.company_name ?? 'A company'}</p>
                        {topImproved.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {topImproved.map((name) => (
                              <span key={name} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                +{name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-indigo-500 font-medium shrink-0">View →</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : matches.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm">No matches yet.</p>
            <p className="text-xs text-gray-400 mt-1">Make sure your visibility is set to Open or Passively open.</p>
            <Link to="/candidate/profile/setup" className="mt-3 inline-block text-indigo-600 text-sm hover:underline">
              Update your profile →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const role = Array.isArray(m.role) ? m.role[0] : m.role
              const employer = Array.isArray(role?.employer) ? role.employer[0] : role?.employer
              const explanation = Array.isArray(m.match_explanation) ? m.match_explanation[0] : m.match_explanation
              const preview = explanation?.candidate_facing_text?.slice(0, 110)

              return (
                <Link
                  key={m.id}
                  to="/candidate/matches/$matchId"
                  params={{ matchId: m.id }}
                  className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-gray-900">{role?.title ?? 'Role'}</span>
                        {m.underemployment_surfaced && (
                          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            Surfaced despite your current title
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{employer?.company_name ?? 'A company'}</p>
                      {preview && (
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                          {preview}{(explanation?.candidate_facing_text?.length ?? 0) > 110 ? '…' : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-semibold text-gray-900">{Math.round(m.overall_score * 100)}%</p>
                      <p className="text-xs text-gray-400">match</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
