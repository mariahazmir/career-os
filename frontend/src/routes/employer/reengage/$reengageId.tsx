import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
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
  const [originalDraft, setOriginalDraft] = useState('')

  useEffect(() => {
    api.get<ReengageRecord>(`/reengage/${reengageId}`)
      .then((r) => {
        setRecord(r)
        const draft = r.outreach_message?.draft_text ?? ''
        const initial = r.outreach_message?.final_text ?? draft
        setText(initial)
        setOriginalDraft(draft)
        if (r.outreach_message?.delivery_status === 'sent') setSent(true)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [reengageId])

  const charCount = text.length
  const isOverLimit = charCount > 400
  const isEdited = useMemo(() => text !== originalDraft, [text, originalDraft])

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
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-role" />
      <div className="cos-layer flex flex-col items-center gap-4">
        <div className="cos-spinner w-10 h-10 border-[3px]" />
        <p className="text-[14px] text-[var(--tx-dim)]">Loading…</p>
      </div>
    </div>
  )

  if (error && !record) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-role" />
      <div className="cos-layer">
        <p className="text-[13.5px] text-[var(--red)]">{error}</p>
      </div>
    </div>
  )

  if (!record) return null

  type RoleShape = { title: string; context_notes: string | null; employer: { company_name: string; industry: string | null } }
  const role = Array.isArray(record.original_match?.role)
    ? (record.original_match!.role as unknown as RoleShape[])[0]
    : record.original_match?.role
  const employer = Array.isArray(role?.employer)
    ? (role!.employer as unknown as Array<{ company_name: string; industry: string | null }>)[0]
    : role?.employer

  const daysSince = useMemo(
    () => Math.floor((Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    [record.created_at]
  )

  return (
    <div className="cos-page">
      <div className="cos-aurora-role" />
      <div className="cos-layer">
        <header className="cos-appbar">
          <div className="cos-brand">
            <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
            Career<span className="cos-brand-sub">OS</span>
          </div>
          <div className="flex-1" />
          <Link to="/employer/dashboard" className="cos-back">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Dashboard
          </Link>
        </header>

        <main className="max-w-[680px] mx-auto px-6 pb-20 pt-4 flex flex-col gap-5">
          {sent ? (
            <div className="cos-card p-14 text-center flex flex-col items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-[var(--orange-soft)] border border-[rgba(255,107,61,0.3)] flex items-center justify-center">
                <svg className="w-7 h-7 text-[var(--orange)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tx)] tracking-tight mb-1.5">Re-engagement sent</h2>
                <p className="text-[14px] text-[var(--tx-dim)]">The candidate will see your message and can choose to respond.</p>
                <p className="text-[12px] text-[var(--tx-mute)] mt-2.5">Redirecting to dashboard…</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="cos-eyebrow-orange mb-3">
                  Re-engagement · {daysSince === 0 ? 'today' : `${daysSince}d ago`}
                </div>
                <h1 className="cos-h1 m-0">{role?.title ?? 'Role'}</h1>
                <p className="text-[14.5px] text-[var(--tx-dim)] mt-2">{employer?.company_name}</p>
              </div>

              {/* Gap delta */}
              <div className="cos-card p-6">
                <h2 className="text-[15px] font-semibold text-[var(--tx)] mb-1">
                  What this candidate has improved
                </h2>
                <p className="text-[12.5px] text-[var(--tx-mute)] mb-5">
                  {record.gap_delta.length} gap{record.gap_delta.length !== 1 ? 's' : ''} closed since original match
                </p>
                <div className="flex flex-col">
                  {record.gap_delta.map((g) => {
                    const prev = Math.round(g.previous_score * 100)
                    const curr = Math.round(g.current_score * 100)
                    const delta = Math.round(g.delta * 100)
                    return (
                      <div key={g.dimension_name} className="flex flex-col gap-2 py-4 border-t border-[var(--line)] first:border-t-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[14px] font-semibold text-[var(--tx)]">{g.dimension_name}</span>
                            <span className="text-[11px] text-[var(--tx-mute)]">{TIER_LABELS[g.tier]}</span>
                          </div>
                          <span className="text-[13px] font-semibold text-[#4ade80] flex-shrink-0">+{delta}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11.5px] text-[var(--tx-mute)] w-8 text-right">{prev}%</span>
                          <div className={`cos-bar-delta [--prev:${prev}] [--curr:${curr}]`}>
                            <div className="cos-bar-delta-prev" />
                            <div className="cos-bar-delta-orange" />
                          </div>
                          <span className="text-[12px] font-semibold text-[var(--tx)] w-8">{curr}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Outreach message editor */}
              <div className="cos-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-semibold text-[var(--tx)]">Re-engagement message</h2>
                  <span className={`text-[13px] font-semibold tabular-nums ${isOverLimit ? 'text-[var(--red)]' : charCount > 360 ? 'text-[var(--orange)]' : 'text-[var(--tx-mute)]'}`}>
                    {charCount} / 400
                  </span>
                </div>

                <div className={`cos-textarea-soft ${isOverLimit ? '[border-color:var(--red)]' : ''}`}>
                  <textarea
                    aria-label="Re-engagement message text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    disabled={sending}
                  />
                </div>

                {isOverLimit && (
                  <p className="text-[12.5px] text-[var(--red)] mt-2">
                    {charCount - 400} characters over the limit — shorten before sending.
                  </p>
                )}

                {isEdited && (
                  <p className="text-[12px] text-[var(--tx-mute)] mt-2">
                    Editing from AI draft.{' '}
                    <button
                      type="button"
                      onClick={() => setText(originalDraft)}
                      className="text-[var(--orange)] hover:underline bg-transparent border-none cursor-pointer font-inherit text-[12px] p-0"
                    >
                      Restore original
                    </button>
                  </p>
                )}
              </div>

              {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

              <div className="flex gap-3">
                <Link to="/employer/dashboard" className="cos-btn-ghost flex-1 text-center">
                  Back to dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || isOverLimit}
                  className="cos-btn-orange flex-1 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : isEdited ? 'Save & send' : 'Send re-engagement'}
                  {!sending && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
