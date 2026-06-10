import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../../../lib/api'

export const Route = createFileRoute('/employer/role/$roleId/pool/')({
  component: PoolPage,
})

interface MatchCandidate {
  id: string
  overall_score: number
  underemployment_surfaced: boolean
  status: string
  match_explanation: Array<{
    employer_facing_text: string
    strong_dimensions: Array<{ name: string }>
    ats_bypass_reasoning?: string
  }>
  candidate: { id: string; name: string; email: string } | null
  candidate_profile: {
    current_job_title: string | null
    degree: string | null
    field_of_study: string | null
    underemployment_flag: boolean
  } | null
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function CandidateCard({ match, roleId }: { match: MatchCandidate; roleId: string }) {
  const explanation = match.match_explanation?.[0]
  const candidate = match.candidate
  const profile = match.candidate_profile
  const isHidden = match.underemployment_surfaced
  const pct = Math.round(match.overall_score * 100)
  const top3 = explanation?.strong_dimensions?.slice(0, 3).map((d) => d.name) ?? []
  const preview = explanation?.employer_facing_text?.slice(0, 120)
  const name = candidate?.name ?? '—'

  return (
    <Link
      to="/employer/role/$roleId/pool/$matchId"
      params={{ roleId, matchId: match.id }}
      className={`cos-candidate-card${isHidden ? ' cos-candidate-card-hidden' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="cos-av-sm cos-av-name flex-shrink-0">{initials(name)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-semibold text-[var(--tx)]">{name}</span>
              {isHidden && <span className="cos-badge-orange">Hidden talent</span>}
            </div>
            <p className="text-[12.5px] text-[var(--tx-mute)] mt-0.5">{profile?.current_job_title ?? 'No title'}</p>
            {profile?.degree && (
              <p className="text-[11.5px] text-[var(--tx-mute)] mt-0.5 opacity-70">
                {profile.degree}{profile.field_of_study ? ` · ${profile.field_of_study}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {top3.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {top3.map((n) => (
            <span key={n} className={isHidden ? 'cos-chip-orange' : 'cos-chip'}>{n}</span>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10.5px] uppercase tracking-wider text-[var(--tx-mute)] font-medium">Match strength</span>
          <span className="text-[13px] font-semibold text-[var(--tx)]">{pct}%</span>
        </div>
        <div className="cos-bar-track">
          <div className={isHidden ? 'cos-bar-fill-orange' : 'cos-bar-fill-teal'} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {preview && (
        <p className="text-[12.5px] text-[var(--tx-dim)] leading-relaxed">
          {preview}{(explanation?.employer_facing_text?.length ?? 0) > 120 ? '…' : ''}
        </p>
      )}
    </Link>
  )
}

function PoolPage() {
  const { roleId } = Route.useParams()
  const [matches, setMatches] = useState<MatchCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadMatches() {
    const data = await api.get<MatchCandidate[]>(`/match?role_id=${roleId}`)
    setMatches(data)
    return data
  }

  async function runPipeline() {
    setRunning(true)
    try {
      await api.post(`/match/run`, { role_id: roleId })
      const data = await loadMatches()
      if (data.length === 0) setError('No candidates found. Make sure candidates have visibility set to open.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Match pipeline failed')
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    loadMatches()
      .then((data) => { if (data.length === 0) return runPipeline() })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [roleId])

  const hidden = matches.filter((m) => m.underemployment_surfaced)
  const standard = matches.filter((m) => !m.underemployment_surfaced)

  if (loading || running) return (
    <div className="cos-page flex flex-col items-center justify-center gap-5">
      <div className="cos-aurora" />
      <div className="cos-layer flex flex-col items-center gap-4 text-center">
        <div className="cos-spinner w-10 h-10 border-[3px]" />
        <div>
          <p className="text-[17px] font-semibold text-[var(--tx)]">{running ? 'Matching candidates…' : 'Loading pool…'}</p>
          {running && <p className="text-[13px] text-[var(--tx-dim)] mt-1.5">This takes 30–60 seconds for 15 candidates</p>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="cos-page">
      <div className="cos-aurora" />
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

        <main className="max-w-[1100px] mx-auto px-8 pb-20 pt-4">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <div className="cos-eyebrow-orange mb-3">Discovery pool</div>
              <h1 className="cos-h1 m-0">Matched candidates</h1>
              <p className="text-[14px] text-[var(--tx-dim)] mt-2">Ranked on capability, not job title.</p>
            </div>
            <span className="text-[14px] text-[var(--tx-mute)] pb-1">{matches.length} candidates found</span>
          </div>

          {error && <p className="text-[13.5px] text-[var(--red)] mb-6">{error}</p>}

          {hidden.length > 0 && (
            <section className="mb-9">
              <div className="flex items-center gap-3 mb-4">
                <span className="cos-eyebrow-orange">Hidden talent</span>
                <span className="text-[12px] font-semibold text-[var(--orange)] bg-[var(--orange-soft)] border border-[rgba(255,107,61,0.3)] px-2.5 py-0.5 rounded-full">{hidden.length}</span>
                <span className="text-[12.5px] text-[var(--tx-mute)]">Strong capability a standard ATS filtered out on job title alone.</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {hidden.map((m) => <CandidateCard key={m.id} match={m} roleId={roleId} />)}
              </div>
            </section>
          )}

          {standard.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="cos-eyebrow-teal">{hidden.length > 0 ? 'Other matches' : 'Matched candidates'}</span>
                <span className="text-[12px] font-semibold text-[var(--teal)] bg-[var(--teal-soft)] border border-[rgba(111,198,194,0.3)] px-2.5 py-0.5 rounded-full">{standard.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {standard.map((m) => <CandidateCard key={m.id} match={m} roleId={roleId} />)}
              </div>
            </section>
          )}

          {matches.length === 0 && !error && (
            <div className="cos-card-dashed p-20 text-center">
              <p className="text-[14px] text-[var(--tx-dim)]">No matches found.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
