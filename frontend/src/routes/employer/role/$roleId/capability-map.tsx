import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api } from '../../../../lib/api'

export const Route = createFileRoute('/employer/role/$roleId/capability-map')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: CapabilityMapPage,
})

interface Dimension {
  tier: number
  name: string
  required_score: number
  weight: number
  must_have: boolean
}

interface RoleWithMap {
  id: string
  title: string
  status: string
  role_capability_map: Array<{ id: string; dimensions: Dimension[]; employer_edited: boolean }>
}

const TIER_LABELS: Record<number, string> = {
  1: 'Technical',
  2: 'Transferable',
  3: 'Behavioural',
  4: 'Trajectory',
}

const TIER_CHIP: Record<number, string> = {
  1: 'cos-badge-teal',
  2: 'cos-badge-orange',
  3: 'text-[11px] font-semibold text-[#b07aff] bg-[rgba(176,122,255,0.1)] border border-[rgba(176,122,255,0.25)] px-2.5 py-0.5 rounded-full',
  4: 'cos-chip-green',
}

function CapabilityMapPage() {
  const { roleId } = Route.useParams()
  const navigate = useNavigate()
  const [role, setRole] = useState<RoleWithMap | null>(null)
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<RoleWithMap>(`/role/${roleId}`)
      .then((r) => {
        setRole(r)
        const map = r.role_capability_map?.[0]
        if (map) setDimensions(map.dimensions)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [roleId])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await api.patch(`/role/${roleId}/capability-map`, { dimensions })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleFindCandidates() {
    await navigate({ to: '/employer/role/$roleId/pool', params: { roleId } })
  }

  function updateDimension(index: number, field: keyof Dimension, value: unknown) {
    setDimensions((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  if (loading) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-role" />
      <div className="cos-layer flex flex-col items-center gap-4">
        <div className="cos-spinner w-10 h-10 border-[3px]" />
        <p className="text-[14px] text-[var(--tx-dim)]">Loading capability map…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-role" />
      <div className="cos-layer">
        <p className="text-[13.5px] text-[var(--red)]">{error}</p>
      </div>
    </div>
  )

  const grouped = [1, 2, 3, 4]
    .map((tier) => ({
      tier,
      items: dimensions.map((d, i) => ({ ...d, index: i })).filter((d) => d.tier === tier),
    }))
    .filter((g) => g.items.length > 0)

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
          <div className="cos-steps">
            <span className="text-[var(--tx-mute)]">1. Define role</span>
            <span className="cos-step-now"><span className="cos-step-dot" /><strong className="text-[var(--tx)]">2.</strong> Capability profile</span>
            <span className="text-[var(--tx-mute)]">→ Discovery pool</span>
          </div>
          <div className="flex items-center gap-2.5 ml-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="cos-btn-ghost disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleFindCandidates}
              className="cos-btn-orange-sm"
            >
              Find candidates
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
        </header>

        <main className="max-w-[820px] mx-auto px-8 pb-20 pt-2">
          <div className="mb-8">
            <div className="cos-eyebrow-orange mb-3">Capability map</div>
            <h1 className="cos-h1 m-0">{role?.title}</h1>
            <p className="text-[14.5px] text-[var(--tx-dim)] mt-3 leading-relaxed max-w-[56ch]">
              {dimensions.length} capability requirements extracted. Review and adjust before running the match — or go straight to discovery.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {grouped.map(({ tier, items }) => (
              <section key={tier}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={TIER_CHIP[tier]}>Tier {tier} — {TIER_LABELS[tier]}</span>
                  <span className="text-[12px] text-[var(--tx-mute)]">{items.length} capability{items.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {items.map((d) => (
                    <div key={d.index} className="cos-card p-5">
                      <div className="flex items-start justify-between gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                            <span className="text-[14.5px] font-semibold text-[var(--tx)]">{d.name}</span>
                            {d.must_have && (
                              <span className="text-[10px] font-semibold text-[var(--red)] bg-[rgba(232,75,69,0.1)] border border-[rgba(232,75,69,0.3)] px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Must-have
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-[var(--tx-mute)] uppercase tracking-wider font-medium">Required score</span>
                              <span className="text-[13px] font-semibold text-[var(--tx)]">{Math.round(d.required_score * 100)}%</span>
                            </div>
                            <div className="cos-bar-track">
                              <div className={`cos-bar-score cos-bar-score-orange [--bar-pct:${Math.round(d.required_score * 100)}]`} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-center">
                            <p className="text-[10.5px] text-[var(--tx-mute)] mb-1.5 uppercase tracking-wider font-medium">Weight</p>
                            <input
                              type="number"
                              min="0.5"
                              max="2.0"
                              step="0.1"
                              value={d.weight}
                              aria-label={`Weight for ${d.name}`}
                              onChange={(e) => updateDimension(d.index, 'weight', parseFloat(e.target.value))}
                              className="w-16 cos-input text-center text-[13px] py-2 px-2"
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-[10.5px] text-[var(--tx-mute)] mb-1.5 uppercase tracking-wider font-medium">Must-have</p>
                            <button
                              type="button"
                              aria-label={`Toggle must-have for ${d.name}`}
                              onClick={() => updateDimension(d.index, 'must_have', !d.must_have)}
                              className={`w-10 h-5 rounded-full transition-colors relative ${d.must_have ? 'bg-[var(--red)]' : 'bg-[var(--surface-3)]'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${d.must_have ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="button"
              onClick={handleFindCandidates}
              className="cos-btn-orange text-[16px] px-9 py-4"
            >
              Find candidates
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
