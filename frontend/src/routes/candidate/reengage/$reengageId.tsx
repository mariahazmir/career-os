import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

export const Route = createFileRoute('/candidate/reengage/$reengageId')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: ReengagePage,
})

interface GapDeltaItem {
  dimension_name: string
  tier: number
  previous_score: number
  current_score: number
  delta: number
  confidence: string
}

interface ReengageRecord {
  id: string
  gap_delta: GapDeltaItem[]
  status: string
  created_at: string
  outreach_message: { draft_text: string; character_count: number | null } | null
  original_match: {
    id: string
    overall_score: number
    role: {
      title: string
      context_notes: string | null
      employer: { company_name: string; industry: string | null }
    }
  } | null
}

const CONFIDENCE_STYLES: Record<string, string> = {
  verified: 'bg-green-50 text-green-700 border-green-200',
  inferred: 'bg-amber-50 text-amber-600 border-amber-200',
  self_reported: 'bg-gray-50 text-gray-500 border-gray-200',
}

const TIER_LABELS: Record<number, string> = {
  1: 'Technical',
  2: 'Transferable',
  3: 'Behavioural',
  4: 'Trajectory',
}

function ReengagePage() {
  const { reengageId } = Route.useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<ReengageRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [decided, setDecided] = useState<'accepted' | 'declined' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<ReengageRecord>(`/reengage/${reengageId}`)
      .then((r) => {
        setRecord(r)
        if (r.status === 'accepted' || r.status === 'declined') {
          setDecided(r.status as 'accepted' | 'declined')
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [reengageId])

  async function respond(decision: 'accepted' | 'declined') {
    setResponding(true)
    try {
      await api.post(`/reengage/${reengageId}/respond`, { decision })
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

  if (error || !record) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error ?? 'Record not found'}</p>
    </div>
  )

  const role = Array.isArray(record.original_match?.role) ? record.original_match!.role[0] : record.original_match?.role
  const employer = Array.isArray(role?.employer) ? role!.employer[0] : role?.employer
  const outreach = record.outreach_message

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/candidate/matches" className="text-sm text-gray-400 hover:text-gray-700">← Matches</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">They came back</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Re-engagement</p>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            {employer?.company_name ?? 'An employer'} wants to reconnect
          </h1>
          <p className="text-sm text-gray-500">
            {role?.title} · {employer?.company_name}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            They reviewed you for this role before. Since then, they've noticed you've grown — and they're back.
          </p>
        </div>

        {/* Gap delta — what improved */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">What's changed since your last evaluation</h2>
          <p className="text-xs text-gray-400 mb-4">
            {record.gap_delta.length} capability improvement{record.gap_delta.length !== 1 ? 's' : ''} detected
          </p>
          <div className="space-y-3">
            {record.gap_delta.map((g) => {
              const prev = Math.round(g.previous_score * 100)
              const curr = Math.round(g.current_score * 100)
              const delta = Math.round(g.delta * 100)
              return (
                <div key={g.dimension_name} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-green-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{g.dimension_name}</span>
                        <span className="text-xs text-gray-400">{TIER_LABELS[g.tier]}</span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${CONFIDENCE_STYLES[g.confidence] ?? CONFIDENCE_STYLES.self_reported}`}>
                        {g.confidence.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{prev}%</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full relative">
                        <div className="absolute inset-y-0 left-0 bg-gray-300 rounded-full" style={{ width: `${prev}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all" style={{ width: `${curr}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-900">{curr}%</span>
                      <span className="text-xs text-green-600 font-semibold">+{delta}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Outreach message */}
        {outreach && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Their message to you</h2>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
              {outreach.draft_text}
            </p>
          </div>
        )}

        {/* Accept / Decline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {decided === 'accepted' ? (
            <div className="text-center py-4">
              <p className="text-green-600 font-medium text-sm">You accepted — {employer?.company_name} will be in touch.</p>
              <button type="button" onClick={() => navigate({ to: '/candidate/matches' })}
                className="mt-3 text-indigo-600 text-sm hover:underline">← Back to matches</button>
            </div>
          ) : decided === 'declined' ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">You declined this re-engagement.</p>
              <button type="button" onClick={() => navigate({ to: '/candidate/matches' })}
                className="mt-3 text-indigo-600 text-sm hover:underline">← Back to matches</button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Are you open to reconnecting?</p>
              <p className="text-xs text-gray-400 mb-4">
                If you accept, {employer?.company_name ?? 'the employer'} will receive your updated profile and the message above.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => respond('accepted')}
                  disabled={responding}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {responding ? 'Processing…' : "Yes, I'm open to it"}
                </button>
                <button
                  type="button"
                  onClick={() => respond('declined')}
                  disabled={responding}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Not right now
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
