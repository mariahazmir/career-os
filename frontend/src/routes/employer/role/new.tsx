import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../../../lib/api'

export const Route = createFileRoute('/employer/role/new')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: NewRolePage,
})

const SENIORITY_OPTIONS = [
  { value: '', label: 'Select seniority (optional)' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
]

const LOCATION_OPTIONS = [
  { value: '', label: 'Select location type (optional)' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const SEEDS: Record<string, string> = {
  problem: 'What problem does this person solve? They own ',
  success: 'In 6 months, success looks like: ',
  day: 'A typical week involves: ',
}

function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0
}

function NewRolePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contextNotes, setContextNotes] = useState('')
  const [seniority, setSeniority] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const role = await api.post<{ id: string }>('/role', {
        title,
        description_raw: description,
        context_notes: contextNotes || undefined,
        seniority_level: seniority || undefined,
        location_type: location || undefined,
      })
      await api.post(`/role/${role.id}/capability-map`, {})
      await navigate({ to: '/employer/role/$roleId/capability-map', params: { roleId: role.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  function applySeed(key: string) {
    setDescription((prev) => prev ? prev + ' ' + SEEDS[key] : SEEDS[key])
  }

  return (
    <div className="cos-page">
      <div className="cos-aurora-role" />
      <div className="cos-layer">
        {/* Appbar */}
        <header className="cos-appbar">
          <div className="cos-brand">
            <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
            Career<span className="cos-brand-sub">OS</span>
          </div>
          <div className="flex-1" />
          <div className="cos-steps">
            <span className="cos-step-now"><span className="cos-step-dot" /><strong className="text-[var(--tx)]">1.</strong> Define role</span>
            <span className="text-[var(--tx-mute)]">→ Capability profile</span>
            <span className="text-[var(--tx-mute)]">→ Discovery pool</span>
          </div>
        </header>

        <main className="max-w-[880px] mx-auto px-8 pb-32 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
              <div className="cos-spinner w-14 h-14 border-4" />
              <div>
                <p className="text-[22px] font-semibold text-[var(--tx)] tracking-tight">Extracting capability profile…</p>
                <p className="text-[14px] text-[var(--tx-dim)] mt-2">Separating capability from keywords</p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-9">
                <div className="cos-eyebrow-orange mb-4">New role</div>
                <h1 className="cos-h1-xl">Describe the role.<br />We'll find the capability.</h1>
                <p className="text-[16px] text-[var(--tx-dim)] leading-relaxed mt-4 max-w-[54ch] mx-auto">
                  Forget keyword checklists and rigid templates. Tell us what this person actually does — in your own words.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Job title */}
                <div>
                  <label htmlFor="role-title" className="cos-label text-[15px] font-semibold text-[var(--tx)] mb-3 block">Job title</label>
                  <input
                    id="role-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Data Analyst"
                    className="cos-input text-[16px] py-3.5"
                  />
                </div>

                {/* Hero description textarea */}
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <label htmlFor="role-desc" className="text-[15px] font-semibold text-[var(--tx)]">Describe the role in plain language</label>
                    <span className="text-[12px] text-[var(--tx-mute)]">{wordCount(description)} words</span>
                  </div>
                  <div className="cos-textarea-hero">
                    <textarea
                      id="role-desc"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What problem does this person solve? What does success look like in 6 months?"
                    />
                    <div className="cos-textarea-hero-foot">
                      <span className="text-[12.5px] text-[var(--tx-mute)] mr-auto">Write naturally — or start from a prompt:</span>
                      <button type="button" className="cos-seed" onClick={() => applySeed('problem')}>The problem they solve</button>
                      <button type="button" className="cos-seed" onClick={() => applySeed('success')}>Success in 6 months</button>
                      <button type="button" className="cos-seed" onClick={() => applySeed('day')}>A typical week</button>
                    </div>
                  </div>
                </div>

                {/* Context notes */}
                <div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <label htmlFor="role-context" className="text-[15px] font-semibold text-[var(--tx)]">Why would a candidate care?</label>
                    <span className="text-[12px] text-[var(--tx-mute)]">optional</span>
                  </div>
                  <div className="cos-textarea-soft">
                    <textarea
                      id="role-context"
                      value={contextNotes}
                      onChange={(e) => setContextNotes(e.target.value)}
                      placeholder="Growth opportunities, team culture, what makes this role worth considering…"
                    />
                  </div>
                </div>

                {/* Seniority + Location */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="role-seniority" className="cos-label">Seniority</label>
                    <div className="relative">
                      <select id="role-seniority" value={seniority} onChange={(e) => setSeniority(e.target.value)} className="cos-select">
                        {SENIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tx-mute)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="role-location" className="cos-label">Location</label>
                    <div className="relative">
                      <select id="role-location" value={location} onChange={(e) => setLocation(e.target.value)} className="cos-select">
                        {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tx-mute)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                {error && <p className="text-[13.5px] text-[var(--red)]">{error}</p>}

                <div className="flex flex-col items-center gap-5 mt-2">
                  <button type="submit" disabled={!title || !description} className="cos-btn-orange text-[16px] px-9 py-4 disabled:opacity-40">
                    Extract capability profile
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </button>
                  <div className="cos-explainer max-w-[56ch]">
                    <div className="cos-explainer-icon">
                      <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.2 6.6L21 9l-5.4 4 2 6.8L12 16l-5.6 3.8 2-6.8L3 9l6.8-.4z"/></svg>
                    </div>
                    <span><strong className="text-[var(--tx-dim)]">No keywords needed.</strong> We build a capability map from what you write — tier 1 technical, tier 2 transferable, tier 3 behavioural, tier 4 trajectory.</span>
                  </div>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
