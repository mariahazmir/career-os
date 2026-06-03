import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../../../lib/api'

export const Route = createFileRoute('/employer/role/$roleId/pool/$matchId')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: MatchDetailPage,
})

interface MatchDetail {
  id: string
  overall_score: number
  underemployment_surfaced: boolean
  status: string
  match_explanation: {
    strong_dimensions: Dimension[]
    partial_dimensions: Dimension[]
    gap_dimensions: Dimension[]
    ats_bypass_reasoning?: string
    employer_facing_text: string
    candidate_facing_text: string
    bridge_suggestion?: string
  }
  candidate: {
    id: string
    name: string
    email: string
    candidate_profile: Array<{
      degree: string | null
      field_of_study: string | null
      current_job_title: string | null
      current_employer: string | null
      years_of_experience: number | null
      underemployment_flag: boolean
    }>
  }
  role: { title: string; context_notes: string | null }
  role_capability_map: Array<{ dimensions: RoleDimension[] }>
}

interface Dimension {
  name: string
  tier: number
  candidate_score: number
  required_score: number
  confidence: string
  explanation: string
}

interface RoleDimension {
  name: string
  tier: number
  required_score: number
  weight: number
  must_have: boolean
}

interface OutreachMessage {
  id: string
  draft_text: string
}

const CONFIDENCE_COLOR: Record<string, string> = {
  verified: 'text-green-600 bg-green-50 border-green-200',
  inferred: 'text-amber-600 bg-amber-50 border-amber-200',
  self_reported: 'text-gray-500 bg-gray-50 border-gray-200',
}

function DimensionRow({ d, type }: { d: Dimension; type: 'strong' | 'partial' | 'gap' }) {
  const dotColor = type === 'strong' ? 'bg-green-500' : type === 'partial' ? 'bg-amber-400' : 'bg-red-400'
  const pct = Math.round(d.candidate_score * 100)
  const req = Math.round(d.required_score * 100)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900">{d.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${CONFIDENCE_COLOR[d.confidence] ?? CONFIDENCE_COLOR.self_reported}`}>
              {d.confidence.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-500">{pct}% / {req}% req</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{d.explanation}</p>
      </div>
    </div>
  )
}

function MatchDetailPage() {
  const { roleId, matchId } = Route.useParams()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [outreach, setOutreach] = useState<OutreachMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [expressing, setExpressing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<MatchDetail>(`/match/${matchId}`)
      .then(setMatch)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [matchId])

  async function handleExpressInterest() {
    setExpressing(true)
    try {
      const msg = await api.post<OutreachMessage>(`/match/${matchId}/interest`, {})
      setOutreach(msg)
      setMatch((prev) => prev ? { ...prev, status: 'notified' } : prev)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to express interest')
    } finally {
      setExpressing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !match) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error ?? 'Match not found'}</p>
    </div>
  )

  const exp = match.match_explanation
  const candidate = match.candidate
  const profile = candidate.candidate_profile[0]
  const score = Math.round(match.overall_score * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/employer/role/$roleId/pool" params={{ roleId }} className="text-sm text-gray-400 hover:text-gray-700">
            ← Pool
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{candidate.name}</span>
        </div>
        {match.status === 'pending' ? (
          <button
            type="button"
            onClick={handleExpressInterest}
            disabled={expressing}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {expressing ? 'Drafting outreach…' : 'Express interest'}
          </button>
        ) : (
          <span className="text-sm text-green-600 font-medium">✓ Interest expressed</span>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Candidate header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900">{candidate.name}</h1>
                {match.underemployment_surfaced && (
                  <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    Hidden talent
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{profile.current_job_title ?? '—'}</p>
              {profile.degree && (
                <p className="text-xs text-gray-400 mt-0.5">{profile.degree}{profile.field_of_study ? ` · ${profile.field_of_study}` : ''}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-gray-900">{score}<span className="text-lg text-gray-400">%</span></p>
              <p className="text-xs text-gray-400">match strength</p>
            </div>
          </div>
        </div>

        {/* ATS bypass callout */}
        {match.underemployment_surfaced && exp.ats_bypass_reasoning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Why we surfaced this person</p>
            <p className="text-sm text-amber-900 leading-relaxed">{exp.ats_bypass_reasoning}</p>
          </div>
        )}

        {/* Employer explanation */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Why they're worth considering</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{exp.employer_facing_text}</p>
        </div>

        {/* Capability breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Capability breakdown</h2>

          {exp.strong_dimensions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Strong match</p>
              {exp.strong_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="strong" />)}
            </div>
          )}

          {exp.partial_dimensions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Partial match</p>
              {exp.partial_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="partial" />)}
            </div>
          )}

          {exp.gap_dimensions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-2">Gaps</p>
              {exp.gap_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="gap" />)}
              {exp.bridge_suggestion && (
                <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-indigo-600 mb-1">How this gap could close</p>
                  <p className="text-xs text-indigo-800 leading-relaxed">{exp.bridge_suggestion}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Outreach draft */}
        {outreach && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">AI-drafted outreach</h2>
              <span className={`text-xs ${outreach.draft_text.length > 400 ? 'text-red-500' : 'text-gray-400'}`}>
                {outreach.draft_text.length} / 400
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
              {outreach.draft_text}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              This message will be sent to the candidate once they accept the match.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
