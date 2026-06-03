import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { api } from '../../../lib/api'

export const Route = createFileRoute('/employer/reengage/$reengageId')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: EmployerReengagePage,
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
  candidate_id: string
  gap_delta: GapDeltaItem[]
  status: string
  created_at: string
  outreach_message: {
    id: string
    draft_text: string
    final_text: string | null
    delivery_status: string
    character_count: number | null
  } | null
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

const TIER_LABELS: Record<number, string> = {
  1: 'Technical',
  2: 'Transferable',
  3: 'Behavioural',
  4: 'Trajectory',
}

function EmployerReengagePage() {
  const { reengageId } = Route.useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<ReengageRecord | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const originalDraft = useRef('')

  useEffect(() => {
    api.get<ReengageRecord>(`/reengage/${reengageId}`)
      .then((r) => {
        setRecord(r)
        const initial = r.outreach_message?.final_text ?? r.outreach_message?.draft_text ?? ''
        setText(initial)
        originalDraft.current = r.outreach_message?.draft_text ?? ''
        if (r.outreach_message?.delivery_status === 'sent') setSent(true)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [reengageId])

  const charCount = text.length
  const isOverLimit = charCount > 400
  const isEdited = text !== originalDraft.current

  const originalMatchId = Array.isArray(record?.original_match)
    ? (record!.original_match as unknown as Array<{ id: string }>)[0]?.id
    : record?.original_match?.id

  async function handleSend() {
    if (!originalMatchId) return
    setSending(true)
    setError(null)
    try {
      if (isEdited) {
        await api.patch(`/outreach/${originalMatchId}`, { final_text: text })
      }
      await api.post(`/outreach/${originalMatchId}/send`, {})
      setSent(true)
      setTimeout(() => navigate({ to: '/employer/dashboard' }), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error && !record) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error}</p>
    </div>
  )

  if (!record) return null

  const role = Array.isArray(record.original_match?.role)
    ? (record.original_match!.role as unknown as Array<{ title: string }>)[0]
    : record.original_match?.role
  const employer = Array.isArray(role?.employer)
    ? (role!.employer as unknown as Array<{ company_name: string }>)[0]
    : role?.employer

  const daysSince = Math.floor(
    (Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/employer/dashboard" className="text-sm text-gray-400 hover:text-gray-700">← Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Re-engagement</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">
        {sent ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Re-engagement sent</h2>
            <p className="text-sm text-gray-500">The candidate will see your message and can choose to respond.</p>
            <p className="text-xs text-gray-400 mt-3">Redirecting to dashboard…</p>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                    Re-engagement — {daysSince === 0 ? 'today' : `${daysSince}d ago`}
                  </p>
                  <h1 className="text-xl font-semibold text-gray-900">{role?.title ?? 'Role'}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{employer?.company_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Original score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((record.original_match?.overall_score ?? 0) * 100)}
                    <span className="text-base text-gray-400">%</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Gap delta — what improved */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                What this candidate has improved since you last evaluated them
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                {record.gap_delta.length} gap{record.gap_delta.length !== 1 ? 's' : ''} closed since original match
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
                          <span className="text-xs font-semibold text-green-600">+{delta}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-8 text-right">{prev}%</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full relative">
                            <div className="absolute inset-y-0 left-0 bg-gray-300 rounded-full" style={{ width: `${prev}%` }} />
                            <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full" style={{ width: `${curr}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-900 w-8">{curr}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Outreach editor */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Re-engagement message</h2>
                <span className={`text-sm font-medium tabular-nums ${isOverLimit ? 'text-red-500' : charCount > 360 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {charCount} / 400
                </span>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                disabled={sending}
                className={`w-full border rounded-lg px-4 py-3 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 transition-colors ${
                  isOverLimit
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-200 focus:ring-indigo-200'
                }`}
              />

              {isOverLimit && (
                <p className="text-xs text-red-500 mt-2">
                  {charCount - 400} characters over the limit — shorten before sending.
                </p>
              )}

              {isEdited && (
                <p className="text-xs text-gray-400 mt-2">
                  Editing from AI draft.{' '}
                  <button
                    type="button"
                    onClick={() => setText(originalDraft.current)}
                    className="text-indigo-500 hover:underline"
                  >
                    Restore original
                  </button>
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Link
                to="/employer/dashboard"
                className="flex-1 text-center border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                Back to dashboard
              </Link>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || isOverLimit}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending…' : isEdited ? 'Save & send' : 'Send re-engagement'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
