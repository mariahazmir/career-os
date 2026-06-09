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

const TIER_CHIP: Record<number, string> = {
  1: 'cos-badge-teal',
  2: 'cos-badge-orange',
  3: 'text-[11px] font-semibold text-[#b07aff] bg-[rgba(176,122,255,0.1)] border border-[rgba(176,122,255,0.25)] px-2.5 py-0.5 rounded-full',
  4: 'cos-chip-green',
}

const CONFIDENCE_TOOLTIP: Record<string, string> = {
  verified: 'Backed by a degree, certification, or demonstrated project',
  inferred: 'Estimated from your background — add more detail to strengthen this',
  self_reported: 'Taken from what you stated — external evidence would strengthen this',
}

function confClass(c: string) {
  if (c === 'verified') return 'cos-conf-verified'
  if (c === 'inferred') return 'cos-conf-inferred'
  return 'cos-conf-self'
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const colorCls = pct >= 70 ? 'cos-bar-score-teal' : pct >= 45 ? 'cos-bar-score-orange' : 'cos-bar-score-muted'
  return (
    <div className="flex items-center gap-3">
      <div className="cos-bar-track flex-1">
        <div className={`cos-bar-score ${colorCls} [--bar-pct:${pct}]`} />
      </div>
      <span className="text-[12px] text-[var(--tx-mute)] w-8 text-right font-medium">{pct}%</span>
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
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer flex flex-col items-center gap-4">
        <div className="cos-spinner cos-spinner-teal w-10 h-10 border-[3px]" />
        <p className="text-[14px] text-[var(--tx-dim)]">Loading profile…</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer text-center">
        <p className="text-[13.5px] text-[var(--red)]">{error ?? 'Failed to load profile'}</p>
      </div>
    </div>
  )

  const { candidate, profile, assessment } = data
  const dimensions = assessment?.dimensions ?? []
  const grouped = [1, 2, 3, 4]
    .map((tier) => ({ tier, items: dimensions.filter((d) => d.tier === tier) }))
    .filter((g) => g.items.length > 0)

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
          <nav className="cos-nav-pill">
            <Link to="/candidate/matches" className="cos-nav-link">Matches</Link>
            <Link to="/candidate/profile/capability" className="cos-nav-link active">Profile</Link>
            <Link to="/candidate/dashboard" className="cos-nav-link">Dashboard</Link>
          </nav>
        </header>

        <main className="max-w-[720px] mx-auto px-6 pb-20 pt-4 flex flex-col gap-5">
          {/* Profile header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="cos-eyebrow-teal mb-3">Capability profile</div>
              <h1 className="cos-h1 m-0">{candidate.name}</h1>
              <p className="text-[14px] text-[var(--tx-dim)] mt-2">{profile?.current_job_title ?? 'No title set'}</p>
            </div>
            <Link to="/candidate/profile/setup" className="cos-back text-[13px] flex-shrink-0 mt-1">
              Update profile
            </Link>
          </div>

          {/* Underemployment callout */}
          {assessment?.underemployment_signal && (
            <div className="cos-surfaced">
              <div className="cos-sec-label">
                <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                Underemployment detected
              </div>
              <p className="text-[14.5px] text-[var(--tx-dim)] leading-relaxed">
                Your capability profile significantly exceeds what your current job title suggests. We will surface you to employers looking for these capabilities — not just your last title.
              </p>
            </div>
          )}

          {/* Career intent */}
          {profile?.career_intent && (
            <div className="cos-why-hero">
              <div className="cos-sec-label">Career intent</div>
              <p className="lede">"{profile.career_intent}"</p>
              {assessment?.tier_4_trajectory_score !== null && assessment?.tier_4_trajectory_score !== undefined && (
                <div className="sig">
                  <span className="text-[var(--tx-mute)]">Trajectory signal</span>
                  <div className="flex-1">
                    <ScoreBar value={assessment.tier_4_trajectory_score} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Capability dimensions */}
          {grouped.length === 0 ? (
            <div className="cos-card-dashed p-14 text-center">
              <p className="text-[14px] text-[var(--tx-dim)] mb-3">No assessment yet.</p>
              <Link to="/candidate/profile/setup" className="text-[var(--teal)] text-[13.5px] no-underline hover:underline">
                Build your profile →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-7">
              {grouped.map(({ tier, items }) => (
                <section key={tier}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className={TIER_CHIP[tier]}>Tier {tier} — {TIER_LABELS[tier]}</span>
                    <span className="text-[11.5px] text-[var(--tx-mute)]">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {items.map((d) => (
                      <div key={d.name} className="cos-card p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <span className="text-[14.5px] font-semibold text-[var(--tx)]">{d.name}</span>
                          <span
                            title={CONFIDENCE_TOOLTIP[d.confidence]}
                            className={`${confClass(d.confidence)} cursor-help flex-shrink-0`}
                          >
                            {d.confidence.replace('_', ' ')}
                          </span>
                        </div>
                        <ScoreBar value={d.score} />
                        <p className="text-[12.5px] text-[var(--tx-mute)] mt-2.5 leading-relaxed">{d.evidence_source}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mt-2">
            <p className="text-[12px] text-[var(--tx-mute)]">
              {assessment
                ? `Assessed ${new Date(assessment.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : ''}
            </p>
            <Link to="/candidate/matches" className="cos-btn-teal text-[14px]">
              View my matches
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
