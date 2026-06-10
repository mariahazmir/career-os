import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../../../../lib/api'

export const Route = createFileRoute('/employer/role/$roleId/pool/$matchId/')({
  component: MatchDetailPage,
})

interface MatchExplanation {
  strong_dimensions: Dimension[]
  partial_dimensions: Dimension[]
  gap_dimensions: Dimension[]
  ats_bypass_reasoning?: string
  employer_facing_text: string
  candidate_facing_text: string
  bridge_suggestion?: string
}

interface CandidateProfile {
  degree: string | null
  field_of_study: string | null
  current_job_title: string | null
  current_employer: string | null
  years_of_experience: number | null
  underemployment_flag: boolean
}

interface MatchDetail {
  id: string
  overall_score: number
  underemployment_surfaced: boolean
  status: string
  match_explanation: MatchExplanation | MatchExplanation[]
  candidate: {
    id: string
    name: string
    email: string
    candidate_profile: CandidateProfile | CandidateProfile[]
  } | Array<{ id: string; name: string; email: string; candidate_profile: CandidateProfile | CandidateProfile[] }>
  role: { title: string; context_notes: string | null } | Array<{ title: string; context_notes: string | null }>
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

interface OutreachMessage { id: string }

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function confClass(c: string) {
  if (c === 'verified') return 'cos-conf-verified'
  if (c === 'inferred') return 'cos-conf-inferred'
  return 'cos-conf-self'
}

function pipClass(type: 'strong' | 'partial' | 'gap') {
  if (type === 'strong')  return 'cos-pip cos-pip-strong'
  if (type === 'partial') return 'cos-pip cos-pip-partial'
  return 'cos-pip cos-pip-gap'
}

function pipLabel(type: 'strong' | 'partial' | 'gap') {
  if (type === 'strong')  return 'Strong'
  if (type === 'partial') return 'Partial'
  return 'Gap'
}

function DimensionRow({ d, type }: { d: Dimension; type: 'strong' | 'partial' | 'gap' }) {
  const pct = Math.round(d.candidate_score * 100)
  const req = Math.round(d.required_score * 100)
  return (
    <div className="cos-trow">
      <div className="cos-cell">
        <span className="cos-dim-name">{d.name}</span>
        <span className="cos-dim-desc">{req}% required</span>
      </div>
      <div className="cos-cell">
        <span className="cos-dim-ev">{d.explanation}</span>
        <span className={confClass(d.confidence)}>{d.confidence.replace('_', ' ')}</span>
      </div>
      <div className="cos-cell items-start justify-center">
        <span className={pipClass(type)}>
          <span className="cos-pip-dots">
            <i className="cos-pip-dot" /><i className="cos-pip-dot" /><i className="cos-pip-dot" />
          </span>
          {pipLabel(type)}
        </span>
        <span className="text-[11px] text-[var(--tx-mute)] mt-1">{pct}%</span>
      </div>
    </div>
  )
}

function MatchDetailPage() {
  const { roleId, matchId } = Route.useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState<MatchDetail | null>(null)
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
      await api.post<OutreachMessage>(`/match/${matchId}/interest`, {})
      await navigate({ to: '/employer/role/$roleId/pool/$matchId/outreach', params: { roleId, matchId } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to express interest')
      setExpressing(false)
    }
  }

  if (loading) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-match" />
      <div className="cos-layer"><div className="cos-spinner" /></div>
    </div>
  )

  if (error || !match) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-match" />
      <div className="cos-layer"><p className="text-[var(--red)] text-[13.5px]">{error ?? 'Match not found'}</p></div>
    </div>
  )

  const exp = Array.isArray(match.match_explanation)
    ? match.match_explanation[0]
    : match.match_explanation
  const candidate = Array.isArray(match.candidate)
    ? match.candidate[0]
    : match.candidate
  const profile = Array.isArray(candidate.candidate_profile)
    ? candidate.candidate_profile[0]
    : candidate.candidate_profile
  const role = Array.isArray(match.role) ? match.role[0] : match.role
  const score = Math.round(match.overall_score * 100)
  const name = candidate.name
  const allDimensions = [...exp.strong_dimensions, ...exp.partial_dimensions, ...exp.gap_dimensions]

  return (
    <div className="cos-page">
      <div className="cos-aurora-match" />
      <div className="cos-layer">
        <header className="cos-appbar cos-appbar-narrow">
          <div className="cos-brand">
            <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
            Career<span className="cos-brand-sub">OS</span>
          </div>
          <div className="flex-1" />
          <Link to="/employer/role/$roleId/pool" params={{ roleId }} className="cos-back">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Back to pool
          </Link>
        </header>

        <main className="max-w-[1080px] mx-auto px-8 pb-36 pt-4">
          <div className="cos-crumbs mb-6">
            <Link to="/employer/role/$roleId/pool" params={{ roleId }}>Discovery</Link>
            <span className="cos-sep">/</span>
            <Link to="/employer/role/$roleId/pool" params={{ roleId }}>{role?.title}</Link>
            <span className="cos-sep">/</span>
            <span className="text-[var(--tx-dim)]">{name}</span>
          </div>

          <div className="flex items-center gap-5 mb-2">
            <div className="cos-av-lg">{initials(name)}</div>
            <div className="flex-1">
              {match.underemployment_surfaced && (
                <span className="cos-badge-orange mb-2.5 block w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--orange)]" />
                  Hidden talent
                </span>
              )}
              <h1 className="text-[34px] font-semibold text-[var(--tx)] tracking-tight leading-none">{name}</h1>
              <div className="flex items-center gap-2.5 flex-wrap mt-2.5 text-[14px] text-[var(--tx-dim)]">
                <span>
                  <svg className="w-3.5 h-3.5 inline mr-1 text-[var(--teal)] align-[-2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
                  {profile.current_job_title ?? '—'}
                  {profile.current_employer ? ` at ${profile.current_employer}` : ''}
                </span>
                {profile.degree && (
                  <>
                    <span className="text-[var(--tx-mute)]">·</span>
                    <span>
                      <svg className="w-3.5 h-3.5 inline mr-1 text-[var(--teal)] align-[-2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/></svg>
                      {profile.degree}{profile.field_of_study ? ` · ${profile.field_of_study}` : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-center flex-shrink-0 pl-5 border-l border-[var(--line)]">
              <div className={`cos-gauge mx-auto [--score:${score}]`}>
                <div className="cos-gauge-inner" />
                <strong className="relative z-10 text-[17px] font-semibold text-[var(--tx)]">{score}</strong>
              </div>
              <p className="cos-eyebrow mt-2">Very strong</p>
            </div>
          </div>

          {match.underemployment_surfaced && (
            <section className="cos-hero-callout mt-8 mb-4">
              <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-widest text-[var(--orange)] font-semibold mb-4">
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.2 6.6L21 9l-5.4 4 2 6.8L12 16l-5.6 3.8 2-6.8L3 9l6.8-.4z"/></svg>
                Why we surfaced this person
              </div>
              <h2 className="cos-hero-h max-w-[22ch]">A keyword filter would have thrown this candidate away.</h2>
              {exp.ats_bypass_reasoning && (
                <p className="text-[16px] leading-relaxed text-[var(--tx-dim)] mt-4 max-w-[64ch]">{exp.ats_bypass_reasoning}</p>
              )}
              <div className="cos-verdict">
                <div className="cos-verdict-ats">
                  <div className="cos-verdict-h-ats">
                    <span className="cos-verdict-icon cos-verdict-x grid place-items-center">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </span>
                    A standard ATS sees
                  </div>
                  <ul className="cos-verdict-reasons">
                    <li><span className="cos-verdict-dot-red" /><span>Title "{profile.current_job_title}" — no matching keyword</span></li>
                    <li><span className="cos-verdict-dot-red" /><span>No prior role with the right title in it</span></li>
                    <li><span className="cos-verdict-dot-red" /><span>Skills not listed in a keyword-searchable format</span></li>
                  </ul>
                </div>
                <div className="cos-verdict-mid">
                  <svg className="w-[18px] h-[18px] text-[var(--tx-mute)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </div>
                <div className="cos-verdict-us">
                  <div className="cos-verdict-h-us">
                    <span className="cos-verdict-icon cos-verdict-c grid place-items-center">
                      <svg className="w-2.5 h-2.5 text-[var(--teal)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M20 6L9 17l-5-5"/></svg>
                    </span>
                    What capability matching sees
                  </div>
                  <ul className="cos-verdict-reasons">
                    {exp.strong_dimensions.slice(0, 3).map((d) => (
                      <li key={d.name}><span className="cos-verdict-dot-teal" /><span>{d.name} — strong evidence</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {!match.underemployment_surfaced && (
            <div className="cos-card mt-6 mb-4 p-6">
              <h2 className="text-[17px] font-semibold text-[var(--tx)] mb-3">Why they're worth considering</h2>
              <p className="text-[14.5px] text-[var(--tx-dim)] leading-relaxed">{exp.employer_facing_text}</p>
            </div>
          )}

          {allDimensions.length > 0 && (
            <section className="mt-10">
              <div className="flex items-baseline gap-3 mb-2">
                <h3 className="cos-h3">Capability comparison</h3>
                <span className="text-[12px] text-[var(--tx-mute)]">{allDimensions.length} dimensions</span>
              </div>
              <p className="text-[13.5px] text-[var(--tx-mute)] mb-5 max-w-[62ch] leading-snug">
                Every "candidate brings" claim is tagged — <strong className="text-[var(--teal)]">verified</strong> from evidence, <strong className="text-[var(--orange)]">inferred</strong> from related work, or <strong className="text-[var(--tx-dim)]">self-reported</strong>.
              </p>
              <div className="cos-table">
                <div className="cos-trow cos-trow-head">
                  <div className="cos-cell">Role requires</div>
                  <div className="cos-cell">Candidate brings</div>
                  <div className="cos-cell">Fit</div>
                </div>
                {exp.strong_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="strong" />)}
                {exp.partial_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="partial" />)}
                {exp.gap_dimensions.map((d) => <DimensionRow key={d.name} d={d} type="gap" />)}
              </div>
            </section>
          )}

          {exp.bridge_suggestion && (
            <section className="mt-8">
              <h3 className="cos-h3 mb-4">Gap — how closable?</h3>
              <div className="cos-strengthen">
                <p className="text-[14px] text-[var(--tx-dim)] leading-relaxed mb-5">
                  These gaps were flagged as <strong className="text-[var(--tx)]">closes on the job</strong>, not dealbreakers.
                </p>
                <div className="cos-bridge">
                  <div className="cos-bridge-icon">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </div>
                  <p className="text-[13.5px] text-[var(--tx-dim)] leading-relaxed">{exp.bridge_suggestion}</p>
                </div>
              </div>
            </section>
          )}
        </main>

        <div className="cos-sticky">
          <div className="max-w-[1080px] mx-auto px-8 py-4 flex items-center gap-5">
            <div className="flex items-center gap-3.5 flex-1">
              <div className="cos-av-sm cos-av-name">{initials(name)}</div>
              <div>
                <p className="text-[14.5px] font-semibold text-[var(--tx)]">{name}</p>
                <p className="text-[12.5px] text-[var(--tx-mute)] mt-0.5">{profile.current_job_title}</p>
              </div>
              <span className="text-[12px] text-[var(--tx-mute)] pl-4 border-l border-[var(--line)]">
                <strong className="text-[var(--teal)]">{score}%</strong> capability match
              </span>
            </div>
            {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}
            {match.status === 'pending' ? (
              <button type="button" onClick={handleExpressInterest} disabled={expressing} className="cos-btn-orange">
                {expressing ? (
                  <><span className="cos-spinner cos-spinner-sm w-4 h-4" /> Drafting outreach…</>
                ) : (
                  <>Express interest<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></>
                )}
              </button>
            ) : (
              <span className="text-[14px] font-medium text-[var(--teal)]">✓ Interest expressed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
