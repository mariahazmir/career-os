import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

export const Route = createFileRoute('/candidate/matches/$matchId')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: MatchTransparencyPage,
})

interface MatchTransparency {
  id: string
  overall_score: number
  underemployment_surfaced: boolean
  status: string
  match_explanation: {
    candidate_facing_text: string
    strong_dimensions: Dimension[]
    partial_dimensions: Dimension[]
    gap_dimensions: Dimension[]
    bridge_suggestion?: string
    ats_bypass_reasoning?: string
  }
  role: {
    title: string
    context_notes: string | null
    seniority_level: string | null
    employer: { company_name: string; industry: string | null }
  }
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

const CONFIDENCE_STYLES: Record<string, string> = {
  verified: 'bg-green-50 text-green-700 border-green-200',
  inferred: 'bg-amber-50 text-amber-600 border-amber-200',
  self_reported: 'bg-gray-50 text-gray-500 border-gray-200',
}

function DimensionRow({ d, type }: { d: Dimension; type: 'strong' | 'partial' | 'gap' }) {
  const dot = type === 'strong' ? 'bg-green-500' : type === 'partial' ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900">{d.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${CONFIDENCE_STYLES[d.confidence] ?? CONFIDENCE_STYLES.self_reported}`}>
              {d.confidence.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">{Math.round(d.candidate_score * 100)}% / {Math.round(d.required_score * 100)}%</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{d.explanation}</p>
      </div>
    </div>
  )
}

function MatchTransparencyPage() {
  const { matchId } = Route.useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState<MatchTransparency | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [decided, setDecided] = useState<'accepted' | 'declined' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<MatchTransparency>(`/candidate/matches/${matchId}`)
      .then((m) => {
        setMatch(m)
        if (m.status === 'accepted' || m.status === 'declined') {
          setDecided(m.status as 'accepted' | 'declined')
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [matchId])

  async function respond(decision: 'accepted' | 'declined') {
    setResponding(true)
    try {
      await api.post(`/candidate/matches/${matchId}/respond`, { decision })
      setDecided(decision)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setResponding(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !match) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error ?? 'Match not found'}</p>
    </div>
  )

  const exp = match.match_explanation
  const role = Array.isArray(match.role) ? match.role[0] : match.role
  const employer = Array.isArray(role?.employer) ? role.employer[0] : role?.employer
  const score = Math.round(match.overall_score * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/candidate/matches" className="text-sm text-gray-400 hover:text-gray-700">← Matches</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{role?.title}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">
        {/* Header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{employer?.company_name ?? 'A company'}</p>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">{role?.title}</h1>
              {role?.seniority_level && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{role.seniority_level}</span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-gray-900">{score}<span className="text-lg text-gray-400">%</span></p>
              <p className="text-xs text-gray-400">match strength</p>
            </div>
          </div>
        </div>

        {/* Underemployment callout */}
        {match.underemployment_surfaced && exp.ats_bypass_reasoning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Why you were surfaced despite your current title</p>
            <p className="text-sm text-amber-900 leading-relaxed">{exp.ats_bypass_reasoning}</p>
          </div>
        )}

        {/* Why you matched */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Why you were matched</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{exp.candidate_facing_text}</p>
        </div>

        {/* Capability breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">What this role needs vs what you bring</h2>

          {exp.strong_dimensions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Your strengths for this role</p>
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
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-2">Gaps to be aware of</p>
              {exp.gap_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="gap" />)}
            </div>
          )}
        </div>

        {/* Bridge suggestion */}
        {exp.bridge_suggestion && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1.5">Here's what could strengthen this match</p>
            <p className="text-sm text-indigo-900 leading-relaxed">{exp.bridge_suggestion}</p>
          </div>
        )}

        {/* Accept / Decline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {decided === 'accepted' ? (
            <div className="text-center py-4">
              <p className="text-green-600 font-medium text-sm">✓ You accepted this match</p>
              <p className="text-xs text-gray-400 mt-1">{employer?.company_name} will be in touch shortly.</p>
            </div>
          ) : decided === 'declined' ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">You declined this match.</p>
              <button type="button" onClick={() => navigate({ to: '/candidate/matches' })}
                className="mt-3 text-indigo-600 text-sm hover:underline">← Back to matches</button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Are you interested in this opportunity?</p>
              <p className="text-xs text-gray-400 mb-4">If you accept, {employer?.company_name ?? 'the employer'} will receive a personalised message and your profile.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => respond('accepted')}
                  disabled={responding}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {responding ? 'Processing…' : "Yes, I'm interested"}
                </button>
                <button
                  type="button"
                  onClick={() => respond('declined')}
                  disabled={responding}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Not for me
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
