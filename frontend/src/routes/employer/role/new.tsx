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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <a href="/employer/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Dashboard</a>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Define a role</h1>
        <p className="text-sm text-gray-500 mb-8">
          Describe the role in plain language. We extract the capability requirements — you don't need to know which keywords to use.
        </p>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Analysing role requirements…</p>
            <p className="text-sm text-gray-400 mt-1">Extracting capability map from your description</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Data Analyst"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe the role in plain language
              </label>
              <p className="text-xs text-gray-400 mb-1.5">
                What problem does this person solve? What does success look like in 6 months?
              </p>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={7}
                placeholder="We are building out our analytics function and need someone to work directly with our CFO and engineering leads to turn business questions into data insights..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why would a candidate care? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-1.5">
                Growth opportunities, team culture, what makes this role worth considering.
              </p>
              <textarea
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                rows={3}
                placeholder="We're a 45-person company. The analytics team will be small but growing. Clear path to Analytics Lead within 18 months..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seniority</label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SENIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Extract capability profile
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
