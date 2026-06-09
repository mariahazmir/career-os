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

const TIER_LABELS: Record<number, string> = {
  1: 'Technical',
  2: 'Transferable',
  3: 'Behavioural',
  4: 'Trajectory',
}

function confClass(c: string) {
  if (c === 'verified') return 'cos-conf-verified'
  if (c === 'inferred') return 'cos-conf-inferred'
  return 'cos-conf-self'
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
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer flex flex-col items-center gap-4">
        <div className="cos-spinner cos-spinner-teal w-10 h-10 border-[3px]" />
        <p className="text-[14px] text-[var(--tx-dim)]">Loading…</p>
      </div>
    </div>
  )

  if (error || !record) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer text-center">
        <p className="text-[13.5px] text-[var(--red)]">{error ?? 'Record not found'}</p>
        <Link to="/candidate/matches" className="inline-block mt-4 text-[var(--teal)] text-[13.5px] no-underline hover:underline">← Back to matches</Link>
      </div>
    </div>
  )

  const role = Array.isArray(record.original_match?.role) ? record.original_match!.role[0] : record.original_match?.role
  const employer = Array.isArray(role?.employer) ? role!.employer[0] : role?.employer
  const outreach = record.outreach_message

  return (
    <div className="cos-page">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer">
        <header className="cos-appbar cos-appbar-narrow">
          <div className="cos-brand">
            <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
            Career<span className="cos-brand-sub">OS</span>
          </div>
          <div className="flex-1" />
          <Link to="/candidate/matches" className="cos-back">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Matches
          </Link>
        </header>

        <main className="max-w-[680px] mx-auto px-6 pb-36 pt-4 flex flex-col gap-5">
          {/* Header */}
          <div>
            <div className="cos-badge-teal mb-4">They came back</div>
            <h1 className="cos-h1 m-0">{employer?.company_name ?? 'An employer'} wants to reconnect</h1>
            <p className="text-[14.5px] text-[var(--tx-dim)] mt-3">
              {role?.title} · {employer?.company_name}
            </p>
            <p className="text-[13px] text-[var(--tx-mute)] mt-2 leading-relaxed max-w-[52ch]">
              They reviewed you for this role before. Since then, they've noticed you've grown — and they're back.
            </p>
          </div>

          {/* Gap delta — what improved */}
          <div className="cos-card p-6">
            <h2 className="text-[15px] font-semibold text-[var(--tx)] mb-1">What's changed since your last evaluation</h2>
            <p className="text-[12.5px] text-[var(--tx-mute)] mb-5">
              {record.gap_delta.length} capability improvement{record.gap_delta.length !== 1 ? 's' : ''} detected
            </p>
            <div className="flex flex-col gap-0">
              {record.gap_delta.map((g) => {
                const prev = Math.round(g.previous_score * 100)
                const curr = Math.round(g.current_score * 100)
                const delta = Math.round(g.delta * 100)
                return (
                  <div key={g.dimension_name} className="cos-trow border-[var(--line)] first:border-t-0 border-t border-solid py-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[14px] font-semibold text-[var(--tx)]">{g.dimension_name}</span>
                        <span className="text-[11px] text-[var(--tx-mute)]">{TIER_LABELS[g.tier]}</span>
                        <span className={confClass(g.confidence)}>{g.confidence.replace('_', ' ')}</span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#4ade80]">+{delta}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11.5px] text-[var(--tx-mute)] w-8 text-right">{prev}%</span>
                      <div className={`cos-bar-delta [--prev:${prev}] [--curr:${curr}]`}>
                        <div className="cos-bar-delta-prev" />
                        <div className="cos-bar-delta-teal" />
                      </div>
                      <span className="text-[12px] font-semibold text-[var(--tx)] w-8">{curr}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Outreach message */}
          {outreach && (
            <div className="cos-why-hero">
              <div className="cos-sec-label">
                <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Their message to you
              </div>
              <p className="lede">{outreach.draft_text}</p>
            </div>
          )}
        </main>

        {/* Sticky decision bar */}
        {decided === 'accepted' ? (
          <div className="cos-sticky">
            <div className="max-w-[680px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-[var(--teal)]">You're open to reconnecting</p>
                <p className="text-[12.5px] text-[var(--tx-mute)] mt-0.5">{employer?.company_name ?? 'The employer'} will be in touch.</p>
              </div>
              <button type="button" onClick={() => navigate({ to: '/candidate/matches' })} className="cos-back text-[13px]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </button>
            </div>
          </div>
        ) : decided === 'declined' ? (
          <div className="cos-sticky">
            <div className="max-w-[680px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <p className="text-[14px] text-[var(--tx-dim)]">You declined this re-engagement.</p>
              <button type="button" onClick={() => navigate({ to: '/candidate/matches' })} className="cos-back text-[13px]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back to matches
              </button>
            </div>
          </div>
        ) : (
          <div className="cos-sticky">
            <div className="max-w-[680px] mx-auto px-6 py-5">
              <div className="flex items-center justify-between gap-4 mb-3.5">
                <div>
                  <p className="text-[14.5px] font-semibold text-[var(--tx)]">Are you open to reconnecting?</p>
                  <p className="text-[12px] text-[var(--tx-mute)] mt-0.5">
                    If you accept, {employer?.company_name ?? 'the employer'} receives your updated profile and the message above.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => respond('accepted')}
                  disabled={responding}
                  className="cos-btn-teal flex-1 text-[15px] py-3.5 disabled:opacity-50"
                >
                  {responding ? 'Processing…' : "Yes, I'm open to it"}
                </button>
                <button
                  type="button"
                  onClick={() => respond('declined')}
                  disabled={responding}
                  className="cos-btn-decline"
                >
                  Not right now
                </button>
              </div>
              {error && <p className="text-[12.5px] text-[var(--red)] mt-2">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
