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

function confClass(c: string) {
  if (c === 'verified') return 'cos-conf-verified'
  if (c === 'inferred') return 'cos-conf-inferred'
  return 'cos-conf-self'
}

function DimensionRow({ d, type }: { d: Dimension; type: 'strong' | 'partial' | 'gap' }) {
  const pip = type === 'strong' ? 'cos-pip-strong' : type === 'partial' ? 'cos-pip-partial' : 'cos-pip-gap'
  const label = type === 'strong' ? 'Strong' : type === 'partial' ? 'Partial' : 'Gap'
  return (
    <div className="cos-trow">
      <div className="cos-cell">
        <span className="cos-dim-name">{d.name}</span>
        <span className="cos-dim-desc">Tier {d.tier}</span>
      </div>
      <div className="cos-cell">
        <span className="cos-dim-ev">{d.explanation}</span>
        <span className={confClass(d.confidence)}>{d.confidence.replace('_', ' ')}</span>
      </div>
      <div className="cos-cell items-center">
        <div className={`cos-pip ${pip}`}>
          <div className="cos-pip-dots">
            <div className="cos-pip-dot" />
            <div className="cos-pip-dot" />
            <div className="cos-pip-dot" />
          </div>
          {label}
        </div>
        <span className="text-[11.5px] text-[var(--tx-mute)]">
          {Math.round(d.candidate_score * 100)}% / {Math.round(d.required_score * 100)}%
        </span>
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
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer flex flex-col items-center gap-4">
        <div className="cos-spinner cos-spinner-teal w-10 h-10 border-[3px]" />
        <p className="text-[14px] text-[var(--tx-dim)]">Loading…</p>
      </div>
    </div>
  )

  if (error || !match) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer text-center">
        <p className="text-[13.5px] text-[var(--red)]">{error ?? 'Match not found'}</p>
        <Link to="/candidate/matches" className="inline-block mt-4 text-[var(--teal)] text-[13.5px] no-underline hover:underline">
          ← Back to matches
        </Link>
      </div>
    </div>
  )

  const exp = match.match_explanation
  const role = Array.isArray(match.role) ? match.role[0] : match.role
  const employer = Array.isArray(role?.employer) ? role.employer[0] : role?.employer
  const score = Math.round(match.overall_score * 100)
  const hasTable =
    exp.strong_dimensions.length + exp.partial_dimensions.length + exp.gap_dimensions.length > 0

  return (
    <div className="cos-page">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer">

        {/* Appbar */}
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

          {/* Role header */}
          <div className="flex items-start justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="cos-eyebrow-teal mb-3">{employer?.company_name ?? 'A company'}</div>
              <h1 className="cos-h1 m-0 leading-none">{role?.title}</h1>
              {role?.seniority_level && (
                <span className="text-[11px] font-semibold text-[var(--tx-mute)] uppercase tracking-wider mt-2.5 block capitalize">
                  {role.seniority_level}
                </span>
              )}
            </div>
            <div className="cos-gauge-wrap flex-shrink-0 pt-1">
              <div className={`cos-gauge mx-auto [--score:${score}]`}>
                <div className="cos-gauge-inner" />
                <span className="relative z-10 text-[13px] font-bold text-[var(--tx)]">{score}</span>
              </div>
              <p className="cos-gauge-lbl">match</p>
            </div>
          </div>

          {/* Why you were matched */}
          <div className="cos-why-hero">
            <div className="cos-sec-label">
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Why you were matched
            </div>
            <p className="lede">{exp.candidate_facing_text?.slice(0, 200)}</p>
            {(exp.candidate_facing_text?.length ?? 0) > 200 && (
              <p className="body">{exp.candidate_facing_text.slice(200)}</p>
            )}
            <div className="sig">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 2l2.2 6.6L21 9l-5.4 4 2 6.8L12 16l-5.6 3.8 2-6.8L3 9l6.8-.4z"/>
              </svg>
              Scored on capability and trajectory — not your job title.
            </div>
          </div>

          {/* Underemployment surfaced callout */}
          {match.underemployment_surfaced && exp.ats_bypass_reasoning && (
            <div className="cos-surfaced">
              <div className="cos-sec-label">
                <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Why you were surfaced despite your current title
              </div>
              <p className="text-[15px] leading-relaxed text-[var(--tx-dim)]">{exp.ats_bypass_reasoning}</p>
            </div>
          )}

          {/* Capability breakdown */}
          {hasTable && (
            <div>
              <h2 className="text-[10.5px] font-semibold text-[var(--tx-mute)] uppercase tracking-[1.6px] mb-3">
                Capability breakdown
              </h2>
              <div className="cos-table">
                <div className="cos-trow cos-trow-head">
                  <div className="cos-cell">Capability</div>
                  <div className="cos-cell">Evidence</div>
                  <div className="cos-cell cos-cell-teal-hd">Fit</div>
                </div>
                {exp.strong_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="strong" />)}
                {exp.partial_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="partial" />)}
                {exp.gap_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="gap" />)}
              </div>
            </div>
          )}

          {/* Bridge suggestion */}
          {exp.bridge_suggestion && (
            <div className="cos-strengthen">
              <div className="cos-bridge">
                <div className="cos-bridge-icon">
                  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold text-[var(--teal)] uppercase tracking-[1.4px] mb-2">
                    What could strengthen this match
                  </p>
                  <p className="text-[15px] text-[var(--tx-dim)] leading-relaxed">{exp.bridge_suggestion}</p>
                </div>
              </div>
            </div>
          )}

          {/* Context notes */}
          {role?.context_notes && (
            <div className="cos-card p-6">
              <p className="text-[10.5px] font-semibold text-[var(--tx-mute)] uppercase tracking-[1.4px] mb-3">About this role</p>
              <p className="text-[14.5px] text-[var(--tx-dim)] leading-relaxed">{role.context_notes}</p>
            </div>
          )}

        </main>

        {/* Sticky decision bar */}
        {decided === 'accepted' ? (
          <div className="cos-sticky">
            <div className="max-w-[680px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-[var(--teal)]">You accepted this match</p>
                <p className="text-[12.5px] text-[var(--tx-mute)] mt-0.5">
                  {employer?.company_name ?? 'The employer'} will receive your profile and be in touch.
                </p>
              </div>
              <Link to="/candidate/matches" className="cos-back text-[13px]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                Back
              </Link>
            </div>
          </div>
        ) : decided === 'declined' ? (
          <div className="cos-sticky">
            <div className="max-w-[680px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
              <p className="text-[14px] text-[var(--tx-dim)]">You declined this match.</p>
              <button
                type="button"
                onClick={() => navigate({ to: '/candidate/matches' })}
                className="cos-back text-[13px]"
              >
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
                  <p className="text-[14.5px] font-semibold text-[var(--tx)]">Are you interested?</p>
                  <p className="text-[12px] text-[var(--tx-mute)] mt-0.5">
                    Accepting sends {employer?.company_name ?? 'the employer'} your profile and a personalised message.
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
                  {responding ? 'Processing…' : "Yes, I'm interested"}
                </button>
                <button
                  type="button"
                  onClick={() => respond('declined')}
                  disabled={responding}
                  className="cos-btn-decline"
                >
                  Not for me
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
