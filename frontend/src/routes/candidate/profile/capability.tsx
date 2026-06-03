import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

export const Route = createFileRoute('/candidate/profile/capability')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: CapabilityProfilePage,
})

interface Dimension {
  tier: number
  name: string
  score: number
  confidence: 'verified' | 'inferred' | 'self_reported'
  evidence_source: string
}

interface ProfileData {
  candidate: { name: string; email: string }
  profile: {
    current_job_title: string | null
    underemployment_flag: boolean
    visibility_status: string
    career_intent: string | null
  } | null
  assessment: {
    dimensions: Dimension[]
    underemployment_signal: boolean
    tier_4_trajectory_score: number | null
    created_at: string
  } | null
}

const TIER_LABELS: Record<number, string> = {
  1: 'Technical skills',
  2: 'Transferable skills',
  3: 'Behavioural signals',
  4: 'Trajectory',
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-green-100 text-green-700',
}

const CONFIDENCE_STYLES: Record<string, string> = {
  verified: 'bg-green-50 text-green-700 border-green-200',
  inferred: 'bg-amber-50 text-amber-600 border-amber-200',
  self_reported: 'bg-gray-50 text-gray-500 border-gray-200',
}

const CONFIDENCE_TOOLTIP: Record<string, string> = {
  verified: 'Backed by a degree, certification, or demonstrated project',
  inferred: 'Estimated from your background — add more detail to strengthen this',
  self_reported: 'Taken from what you stated — external evidence would strengthen this',
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 45 ? 'bg-amber-400' : 'bg-gray-300'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right">{pct}%</span>
    </div>
  )
}

function CapabilityProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<ProfileData>('/candidate/profile')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error ?? 'Failed to load profile'}</p>
    </div>
  )

  const { candidate, profile, assessment } = data
  const dimensions = assessment?.dimensions ?? []
  const grouped = [1, 2, 3, 4].map((tier) => ({
    tier,
    items: dimensions.filter((d) => d.tier === tier),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Career OS</span>
        <div className="flex items-center gap-4">
          <Link to="/candidate/matches" className="text-sm text-indigo-600 hover:underline">My matches</Link>
          <Link to="/candidate/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{candidate.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.current_job_title ?? 'No title set'}</p>
          </div>
          <Link to="/candidate/profile/setup"
            className="text-sm text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            Update profile
          </Link>
        </div>

        {/* Underemployment callout */}
        {assessment?.underemployment_signal && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Underemployment detected</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              Your capability profile significantly exceeds what your current job title suggests. We will surface you to employers looking for these capabilities, not just your last title.
            </p>
          </div>
        )}

        {/* Career intent */}
        {profile?.career_intent && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Career intent</p>
            <p className="text-sm text-gray-700 leading-relaxed">"{profile.career_intent}"</p>
            {assessment?.tier_4_trajectory_score !== null && assessment?.tier_4_trajectory_score !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-xs text-gray-400">Trajectory signal</p>
                <ScoreBar value={assessment.tier_4_trajectory_score} />
              </div>
            )}
          </div>
        )}

        {/* Capability dimensions */}
        {grouped.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No assessment yet.</p>
            <Link to="/candidate/profile/setup" className="mt-2 inline-block text-indigo-600 text-sm hover:underline">
              Build your profile →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ tier, items }) => (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[tier]}`}>
                    Tier {tier} — {TIER_LABELS[tier]}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((d) => (
                    <div key={d.name} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-900">{d.name}</span>
                        <span
                          title={CONFIDENCE_TOOLTIP[d.confidence]}
                          className={`text-xs px-1.5 py-0.5 rounded border cursor-help shrink-0 ${CONFIDENCE_STYLES[d.confidence]}`}
                        >
                          {d.confidence.replace('_', ' ')}
                        </span>
                      </div>
                      <ScoreBar value={d.score} />
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">{d.evidence_source}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {assessment ? `Assessed ${new Date(assessment.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </p>
          <Link to="/candidate/matches"
            className="bg-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-indigo-700">
            View my matches →
          </Link>
        </div>
      </main>
    </div>
  )
}
