import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'

interface ExistingProfile {
  profile: {
    degree: string | null
    field_of_study: string | null
    institution: string | null
    graduation_year: number | null
    current_job_title: string | null
    current_employer: string | null
    years_of_experience: number | null
    underemployment_flag: boolean
    visibility_status: string
    career_intent: string | null
    skills: Array<{ name: string; years?: number }> | null
    projects: Array<{ title: string; description?: string; url?: string }> | null
    certifications: Array<{ name: string; issuer?: string; year?: number }> | null
  } | null
}

export const Route = createFileRoute('/candidate/profile/setup')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: ProfileSetupPage,
})

interface Skill { name: string; years: number }
interface Project { title: string; description: string; url: string }
interface Certification { name: string; issuer: string; year: string }

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-indigo-900 ml-0.5">×</button>
    </span>
  )
}

function ProfileSetupPage() {
  const navigate = useNavigate()
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Education
  const [degree, setDegree] = useState('')
  const [field, setField] = useState('')
  const [institution, setInstitution] = useState('')
  const [gradYear, setGradYear] = useState('')

  // Current situation
  const [jobTitle, setJobTitle] = useState('')
  const [employer, setEmployer] = useState('')
  const [yearsExp, setYearsExp] = useState('')
  const [underemployed, setUnderemployed] = useState(false)
  const [visibility, setVisibility] = useState<'open' | 'passive' | 'closed'>('open')

  // Intent
  const [careerIntent, setCareerIntent] = useState('')

  // Skills
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [skillYears, setSkillYears] = useState('1')

  // Projects
  const [projects, setProjects] = useState<Project[]>([])
  const [projTitle, setProjTitle] = useState('')
  const [projDesc, setProjDesc] = useState('')
  const [projUrl, setProjUrl] = useState('')

  // Certifications
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [certName, setCertName] = useState('')
  const [certIssuer, setCertIssuer] = useState('')
  const [certYear, setCertYear] = useState('')

  // Prefill from existing profile on mount
  useEffect(() => {
    api.get<ExistingProfile>('/candidate/profile')
      .then(({ profile: p }) => {
        if (!p) return
        setDegree(p.degree ?? '')
        setField(p.field_of_study ?? '')
        setInstitution(p.institution ?? '')
        setGradYear(p.graduation_year?.toString() ?? '')
        setJobTitle(p.current_job_title ?? '')
        setEmployer(p.current_employer ?? '')
        setYearsExp(p.years_of_experience?.toString() ?? '')
        setUnderemployed(p.underemployment_flag)
        setVisibility((p.visibility_status as 'open' | 'passive' | 'closed') ?? 'open')
        setCareerIntent(p.career_intent ?? '')
        setSkills((p.skills ?? []).map((s) => ({ name: s.name, years: s.years ?? 1 })))
        setProjects((p.projects ?? []).map((pr) => ({
          title: pr.title,
          description: pr.description ?? '',
          url: pr.url ?? '',
        })))
        setCertifications((p.certifications ?? []).map((c) => ({
          name: c.name,
          issuer: c.issuer ?? '',
          year: c.year?.toString() ?? '',
        })))
      })
      .catch(() => { /* no profile yet, form stays empty */ })
      .finally(() => setFetching(false))
  }, [])

  function addSkill() {
    const name = skillInput.trim()
    if (!name || skills.find((s) => s.name.toLowerCase() === name.toLowerCase())) return
    setSkills((prev) => [...prev, { name, years: parseInt(skillYears) || 1 }])
    setSkillInput('')
  }

  function addProject() {
    if (!projTitle.trim()) return
    setProjects((prev) => [...prev, { title: projTitle.trim(), description: projDesc.trim(), url: projUrl.trim() }])
    setProjTitle(''); setProjDesc(''); setProjUrl('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.post('/candidate/profile', {
        degree: degree || undefined,
        field_of_study: field || undefined,
        institution: institution || undefined,
        graduation_year: gradYear ? parseInt(gradYear) : undefined,
        current_job_title: jobTitle || undefined,
        current_employer: employer || undefined,
        years_of_experience: yearsExp ? parseInt(yearsExp) : undefined,
        underemployment_flag: underemployed,
        visibility_status: visibility,
        career_intent: careerIntent || undefined,
        skills: skills.map((s) => ({ name: s.name, category: 'technical', years: s.years })),
        projects: projects.map((p) => ({
          title: p.title,
          description: p.description || undefined,
          url: p.url || undefined,
          skills_used: [],
        })),
        certifications: certifications.map((c) => ({
          name: c.name,
          issuer: c.issuer || undefined,
          year: c.year ? parseInt(c.year) : undefined,
        })),
      })
      await navigate({ to: '/candidate/profile/capability' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (fetching) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-700 font-medium">Building your capability profile…</p>
      <p className="text-sm text-gray-400">Analysing your background and intent</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <span className="font-semibold text-gray-900">Career OS</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Build your profile</h1>
        <p className="text-sm text-gray-500 mb-8">
          Be honest and specific. The more context you give, the more accurately we can represent your true capability.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Education */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Education</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Degree</label>
                <input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="e.g. Bachelor of Computer Science"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Field of study</label>
                <input value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Computer Science"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Institution</label>
                <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Universiti Malaya"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Graduation year</label>
                <input type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="e.g. 2022"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </section>

          {/* Current situation */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Current situation</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Current job title</label>
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Sales Executive"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employer</label>
                <input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="e.g. Acme Sdn Bhd"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Years of experience</label>
                <input type="number" min="0" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label htmlFor="visibility" className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
                <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="open">Open — actively looking</option>
                  <option value="passive">Passively open — right role only</option>
                  <option value="closed">Not looking right now</option>
                </select>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <input type="checkbox" id="underemployed" checked={underemployed} onChange={(e) => setUnderemployed(e.target.checked)}
                className="mt-0.5 accent-indigo-600" />
              <label htmlFor="underemployed" className="text-sm text-amber-900 leading-relaxed cursor-pointer">
                I'm currently working in a role that doesn't reflect my qualification level.
                <span className="block text-xs text-amber-600 mt-0.5">Many qualified people land in this situation. Flagging this helps us surface you to the right employers based on what you're actually capable of.</span>
              </label>
            </div>
          </section>

          {/* Career intent */}
          <section className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Where you're heading</h2>
            <p className="text-xs text-gray-400 mb-3">What kind of work do you want to be doing? Be specific — this shapes how we assess your trajectory.</p>
            <textarea value={careerIntent} onChange={(e) => setCareerIntent(e.target.value)} rows={3}
              placeholder="e.g. I want to move into data analytics. I've been building Python and SQL skills on the side and want to work in a role where I can own the analytics function at a tech company."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </section>

          {/* Skills */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Skills</h2>
            <div className="flex gap-2">
              <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                placeholder="Skill name (e.g. Python)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="number" min="1" max="20" value={skillYears} onChange={(e) => setSkillYears(e.target.value)}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="yrs" />
              <button type="button" onClick={addSkill}
                className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700">Add</button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <Tag key={i} label={`${s.name} · ${s.years}yr`} onRemove={() => setSkills((p) => p.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}
          </section>

          {/* Projects */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Projects & self-directed work</h2>
            <p className="text-xs text-gray-400">Side projects, freelance work, self-study outputs, open source contributions.</p>
            <div className="space-y-2">
              <input value={projTitle} onChange={(e) => setProjTitle(e.target.value)} placeholder="Project title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <textarea value={projDesc} onChange={(e) => setProjDesc(e.target.value)} rows={2} placeholder="What did you build and what did you learn?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              <div className="flex gap-2">
                <input value={projUrl} onChange={(e) => setProjUrl(e.target.value)} placeholder="URL (optional)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button type="button" onClick={addProject}
                  className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700">Add</button>
              </div>
            </div>
            {projects.length > 0 && (
              <div className="space-y-2">
                {projects.map((p, i) => (
                  <div key={i} className="flex items-start justify-between bg-gray-50 rounded-lg p-3 gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.title}</p>
                      {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                    </div>
                    <button type="button" onClick={() => setProjects((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-gray-400 hover:text-red-500 shrink-0">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Certifications */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Certifications</h2>
            <p className="text-xs text-gray-400">Formal certifications, online course completions, professional qualifications.</p>
            <div className="space-y-2">
              <input value={certName} onChange={(e) => setCertName(e.target.value)} placeholder="Certification name (e.g. Google Data Analytics Certificate)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex gap-2">
                <input value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} placeholder="Issuer (e.g. Google / Coursera)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="number" value={certYear} onChange={(e) => setCertYear(e.target.value)} placeholder="Year"
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button
                  type="button"
                  onClick={() => {
                    if (!certName.trim()) return
                    setCertifications((prev) => [...prev, { name: certName.trim(), issuer: certIssuer.trim(), year: certYear }])
                    setCertName(''); setCertIssuer(''); setCertYear('')
                  }}
                  className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700"
                >Add</button>
              </div>
            </div>
            {certifications.length > 0 && (
              <div className="space-y-2">
                {certifications.map((c, i) => (
                  <div key={i} className="flex items-start justify-between bg-gray-50 rounded-lg p-3 gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[c.issuer, c.year].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button type="button" onClick={() => setCertifications((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-gray-400 hover:text-red-500 shrink-0">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit"
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors">
            Build my capability profile
          </button>
        </form>
      </main>
    </div>
  )
}
