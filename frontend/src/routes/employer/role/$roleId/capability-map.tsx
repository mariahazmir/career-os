import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
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

const TIER_LABELS: Record<number, string> = { 1: 'Technical', 2: 'Transferable', 3: 'Behavioural', 4: 'Trajectory' }
const TIER_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-green-100 text-green-700',
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{Math.round(value * 100)}%</span>
    </div>
  )
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600 text-sm">{error}</p>
    </div>
  )

  const grouped = [1, 2, 3, 4].map((tier) => ({
    tier,
    items: dimensions.map((d, i) => ({ ...d, index: i })).filter((d) => d.tier === tier),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/employer/dashboard" className="text-sm text-gray-400 hover:text-gray-700">← Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{role?.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
          <button
            onClick={handleFindCandidates}
            className="bg-indigo-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-indigo-700"
          >
            Find candidates →
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Capability map</h1>
        <p className="text-sm text-gray-500 mb-8">
          We extracted {dimensions.length} capability requirements from your role description. Review and adjust before running the match.
        </p>

        <div className="space-y-8">
          {grouped.map(({ tier, items }) => (
            <div key={tier}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLORS[tier]}`}>
                  Tier {tier} — {TIER_LABELS[tier]}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((d) => (
                  <div key={d.index} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 text-sm">{d.name}</span>
                          {d.must_have && (
                            <span className="text-xs font-semibold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                              Must-have
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Required score</span>
                            </div>
                            <ScoreBar value={d.required_score} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Weight</p>
                          <input
                            type="number"
                            min="0.5" max="2.0" step="0.1"
                            value={d.weight}
                            onChange={(e) => updateDimension(d.index, 'weight', parseFloat(e.target.value))}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Must-have</p>
                          <button
                            onClick={() => updateDimension(d.index, 'must_have', !d.must_have)}
                            className={`w-10 h-5 rounded-full transition-colors ${d.must_have ? 'bg-red-500' : 'bg-gray-200'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${d.must_have ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleFindCandidates}
            className="bg-indigo-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-indigo-700"
          >
            Find candidates →
          </button>
        </div>
      </main>
    </div>
  )
}
