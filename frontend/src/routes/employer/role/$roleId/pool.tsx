import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../../lib/api'

export const Route = createFileRoute('/employer/role/$roleId/pool')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: PoolPage,
})

interface MatchCandidate {
  id: string
  overall_score: number
  underemployment_surfaced: boolean
  status: string
  match_explanation: Array<{
    employer_facing_text: string
    strong_dimensions: Array<{ name: string }>
    ats_bypass_reasoning?: string
  }>
  candidate: { id: string; name: string; email: string } | null
  candidate_profile: {
    current_job_title: string | null
    degree: string | null
    field_of_study: string | null
    underemployment_flag: boolean
  } | null
}

function MatchStrengthBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-gray-300'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  )
}

function CandidateCard({ match, roleId }: { match: MatchCandidate; roleId: string }) {
  const explanation = match.match_explanation?.[0]
  const candidate = match.candidate
  const profile = match.candidate_profile

  const top3 = explanation?.strong_dimensions?.slice(0, 3).map((d) => d.name) ?? []
  const preview = explanation?.employer_facing_text?.slice(0, 130)

  return (
    <Link
      to="/employer/role/$roleId/pool/$matchId"
      params={{ roleId, matchId: match.id }}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-medium text-gray-900">{candidate?.name ?? '—'}</span>
            {match.underemployment_surfaced && (
              <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                Hidden talent
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{profile?.current_job_title ?? 'No title'}</p>
          {profile?.degree && (
            <p className="text-xs text-gray-400 mt-0.5">{profile.degree}{profile.field_of_study ? ` · ${profile.field_of_study}` : ''}</p>
          )}
          {top3.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {top3.map((name) => (
                <span key={name} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{name}</span>
              ))}
            </div>
          )}
          {preview && (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{preview}{explanation!.employer_facing_text.length > 130 ? '…' : ''}</p>
          )}
        </div>
        <div className="shrink-0 w-28">
          <p className="text-xs text-gray-400 mb-1 text-right">Match strength</p>
          <MatchStrengthBar score={match.overall_score} />
        </div>
      </div>
    </Link>
  )
}

export default function PoolPage() {
  const { roleId } = Route.useParams()
  const [matches, setMatches] = useState<MatchCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadMatches() {
    const data = await api.get<MatchCandidate[]>(`/match?role_id=${roleId}`)
    setMatches(data)
    return data
  }

  async function runPipeline() {
    setRunning(true)
    try {
      await api.post(`/match/run`, { role_id: roleId })
      const data = await loadMatches()
      if (data.length === 0) setError('No candidates found. Make sure candidates have visibility set to open.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Match pipeline failed')
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    loadMatches()
      .then((data) => { if (data.length === 0) return runPipeline() })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [roleId])

  const hidden = matches.filter((m) => m.underemployment_surfaced)
  const standard = matches.filter((m) => !m.underemployment_surfaced)

  if (loading || running) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="inline-block w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600 font-medium">{running ? 'Matching candidates…' : 'Loading…'}</p>
      {running && <p className="text-sm text-gray-400">This takes 30–60 seconds for 15 candidates</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/employer/dashboard" className="text-sm text-gray-400 hover:text-gray-700">← Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Discovery pool</span>
        </div>
        <span className="text-sm text-gray-500">{matches.length} candidates</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

        {hidden.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Talent your ATS would have missed</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{hidden.length}</span>
            </div>
            <div className="space-y-3">
              {hidden.map((m) => <CandidateCard key={m.id} match={m} roleId={roleId} />)}
            </div>
          </section>
        )}

        {standard.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              {hidden.length > 0 ? 'Other matches' : 'Matched candidates'}
            </h2>
            <div className="space-y-3">
              {standard.map((m) => <CandidateCard key={m.id} match={m} roleId={roleId} />)}
            </div>
          </section>
        )}

        {matches.length === 0 && !error && (
          <div className="text-center py-16 text-gray-400 text-sm">No matches found.</div>
        )}
      </main>
    </div>
  )
}
