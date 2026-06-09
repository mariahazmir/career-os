import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'

interface ReengageNotification {
  id: string
  gap_delta: Array<{ dimension_name: string; delta: number }>
  created_at: string
  outreach_message: { draft_text: string } | null
  original_match: {
    id: string
    role: { title: string; employer: { company_name: string } }
  } | null
}

export const Route = createFileRoute('/candidate/matches/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: MatchesPage,
})

interface MatchNotification {
  id: string
  overall_score: number
  underemployment_surfaced: boolean
  created_at: string
  match_explanation: Array<{ candidate_facing_text: string }>
  role: Array<{
    title: string
    employer: Array<{ company_name: string; industry: string | null }>
  }>
}

const ANON_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h.01M15 12h.01M9 16h.01M15 16h.01"/>
  </svg>
)

function MatchesPage() {
  const [matches, setMatches] = useState<MatchNotification[]>([])
  const [reengages, setReengages] = useState<ReengageNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<MatchNotification[]>('/candidate/matches'),
      api.get<ReengageNotification[]>('/reengage/candidate').catch(() => [] as ReengageNotification[]),
    ])
      .then(([matchData, reengageData]) => {
        setMatches(matchData)
        setReengages(reengageData)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
          <nav className="cos-nav-pill">
            <Link to="/candidate/matches" className="cos-nav-link active">Matches</Link>
            <Link to="/candidate/profile/capability" className="cos-nav-link">Profile</Link>
            <Link to="/candidate/dashboard" className="cos-nav-link">Dashboard</Link>
          </nav>
          <div className="cos-av-xs ml-2">AR</div>
        </header>

        <main className="max-w-[720px] mx-auto px-8 pb-24 pt-10">
          {/* Visibility pill */}
          <div className="cos-vis-pill mb-10">
            <span className="cos-pulse-dot"><i /></span>
            <span className="text-[13.5px] text-[var(--tx-dim)]">Currently: <strong className="text-[var(--tx)]">Open to opportunities</strong></span>
            <span className="flex-1" />
            <a href="/candidate/profile/setup" className="text-[12.5px] text-[var(--tx-mute)] no-underline px-3.5 py-1.5 rounded-full border border-[var(--line)] hover:bg-[var(--surface-2)] transition-colors">Change</a>
          </div>

          {/* Page header */}
          <div className="mb-7">
            <div className="cos-eyebrow-teal mb-3">Your matches</div>
            <h1 className="cos-h1">{loading ? 'Loading…' : `You have ${matches.length} match${matches.length !== 1 ? 'es' : ''}`}</h1>
            <p className="text-[15px] text-[var(--tx-dim)] mt-3 leading-relaxed max-w-[52ch]">
              Employers reached out because your capabilities fit — not because you applied. Take your time.
            </p>
          </div>

          {/* Re-engagement section */}
          {!loading && reengages.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3.5">
                <h2 className="text-[13.5px] font-semibold text-[var(--tx)]">Employers who came back</h2>
                <span className="text-[11px] font-semibold text-[var(--teal)] bg-[var(--teal-soft)] border border-[rgba(111,198,194,0.3)] px-2.5 py-0.5 rounded-full">{reengages.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {reengages.map((r) => {
                  const match = Array.isArray(r.original_match) ? r.original_match[0] : r.original_match
                  const role = Array.isArray(match?.role) ? match!.role[0] : match?.role
                  const employer = Array.isArray(role?.employer) ? role!.employer[0] : role?.employer
                  const topImproved = [...r.gap_delta].sort((a, b) => b.delta - a.delta).slice(0, 2).map((g) => g.dimension_name)
                  return (
                    <Link key={r.id} to="/candidate/reengage/$reengageId" params={{ reengageId: r.id }}
                      className="block cos-match-card border-[rgba(111,198,194,0.2)] hover:border-[rgba(111,198,194,0.4)] no-underline">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[15px] font-semibold text-[var(--tx)]">{role?.title ?? 'Role'}</span>
                            <span className="cos-badge-teal text-[10px]">They came back</span>
                          </div>
                          <p className="text-[13px] text-[var(--tx-mute)]">{employer?.company_name ?? 'A company'}</p>
                          {topImproved.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {topImproved.map((n) => <span key={n} className="cos-chip-green">+{n}</span>)}
                            </div>
                          )}
                        </div>
                        <p className="text-[12px] text-[var(--teal)] font-medium flex-shrink-0">View →</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Match cards */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => <div key={i} className="cos-card h-[120px]" />)}
            </div>
          ) : error ? (
            <p className="text-[13.5px] text-[var(--red)]">{error}</p>
          ) : matches.length === 0 ? (
            <div className="cos-card-dashed p-12 text-center">
              <p className="text-[14px] text-[var(--tx-dim)]">No matches yet.</p>
              <p className="text-[12px] text-[var(--tx-mute)] mt-1">Make sure your visibility is set to Open or Passively open.</p>
              <Link to="/candidate/profile/setup" className="inline-block mt-3 text-[var(--teal)] text-[13.5px] no-underline hover:underline">
                Update your profile →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {matches.map((m, idx) => {
                const role = Array.isArray(m.role) ? m.role[0] : m.role
                const employer = Array.isArray(role?.employer) ? role.employer[0] : role?.employer
                const explanation = Array.isArray(m.match_explanation) ? m.match_explanation[0] : m.match_explanation
                const preview = explanation?.candidate_facing_text?.slice(0, 130)
                const isNamed = idx === 0
                const empName = isNamed ? (employer?.company_name ?? 'A company') : idx === 1 ? 'A company in Analytics' : 'A fintech company'

                return (
                  <article key={m.id} className="cos-match-card cos-match-card-unread">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className={`cos-av-sm ${isNamed ? 'cos-av-name' : 'cos-av-sm-anon'}`}>
                        {isNamed ? empName[0] : ANON_ICON}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--tx)]">
                          {empName}
                          {!isNamed && <span className="cos-badge-muted">Anonymous</span>}
                        </div>
                        <p className="text-[13px] text-[var(--tx-mute)] mt-0.5">{role?.title} {employer?.industry ? `· ${employer.industry}` : ''}</p>
                      </div>
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--teal)] flex-shrink-0">
                        <i className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
                        New
                      </span>
                    </div>

                    {preview && (
                      <div className="cos-why-box mb-4">
                        <span className="cos-why-q">Why you were matched</span>
                        <span dangerouslySetInnerHTML={{ __html: preview }} />
                        {(explanation?.candidate_facing_text?.length ?? 0) > 130 ? '…' : ''}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--tx-mute)]">
                        <svg className="w-3.5 h-3.5 text-[var(--teal)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        {isNamed ? 'Mutual interest — they expressed interest first' : 'Identity revealed once you reply'}
                      </span>
                      <Link
                        to="/candidate/matches/$matchId"
                        params={{ matchId: m.id }}
                        className="cos-btn-link text-[var(--tx)] text-[13.5px]"
                      >
                        View match
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <p className="text-center text-[13px] text-[var(--tx-mute)] mt-8 leading-relaxed">
            Only employers you choose to reply to can see your full profile.{' '}
            <strong className="text-[var(--tx-dim)]">Your current employer can never see you here.</strong>
          </p>
        </main>
      </div>
    </div>
  )
}
