import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router'
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

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 cos-chip">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-[var(--teal)] hover:text-[var(--tx)] bg-transparent border-none cursor-pointer p-0 text-[14px] leading-none"
      >×</button>
    </span>
  )
}

const VISIBILITY_OPTIONS = [
  { value: 'open', label: 'Open — actively looking' },
  { value: 'passive', label: 'Passively open — right role only' },
  { value: 'closed', label: 'Not looking right now' },
]

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
          title: pr.title, description: pr.description ?? '', url: pr.url ?? '',
        })))
        setCertifications((p.certifications ?? []).map((c) => ({
          name: c.name, issuer: c.issuer ?? '', year: c.year?.toString() ?? '',
        })))
      })
      .catch(() => { /* no profile yet */ })
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
          title: p.title, description: p.description || undefined,
          url: p.url || undefined, skills_used: [],
        })),
        certifications: certifications.map((c) => ({
          name: c.name, issuer: c.issuer || undefined,
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
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer flex flex-col items-center gap-4">
        <div className="cos-spinner cos-spinner-teal w-10 h-10 border-[3px]" />
      </div>
    </div>
  )

  if (loading) return (
    <div className="cos-page flex flex-col items-center justify-center gap-6">
      <div className="cos-aurora-candidate" />
      <div className="cos-layer flex flex-col items-center gap-5 text-center">
        <div className="cos-spinner cos-spinner-teal w-14 h-14 border-4" />
        <div>
          <p className="text-[22px] font-semibold text-[var(--tx)] tracking-tight">Building your capability profile…</p>
          <p className="text-[14px] text-[var(--tx-dim)] mt-2">Analysing your background and intent</p>
        </div>
      </div>
    </div>
  )

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
          <Link to="/candidate/dashboard" className="cos-back">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Dashboard
          </Link>
        </header>

        <main className="max-w-[720px] mx-auto px-6 pb-24 pt-4">
          <div className="mb-8">
            <div className="cos-eyebrow-teal mb-3">Your profile</div>
            <h1 className="cos-h1 m-0">Build your profile</h1>
            <p className="text-[14.5px] text-[var(--tx-dim)] mt-3 leading-relaxed max-w-[52ch]">
              Be honest and specific. The more context you give, the more accurately we can represent your true capability.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Education */}
            <section className="cos-card p-6 flex flex-col gap-4">
              <h2 className="cos-eyebrow-teal">Education</h2>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="setup-degree" className="cos-label">Degree</label>
                  <input id="setup-degree" value={degree} onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. Bachelor of Computer Science" className="cos-input mt-2" />
                </div>
                <div>
                  <label htmlFor="setup-field" className="cos-label">Field of study</label>
                  <input id="setup-field" value={field} onChange={(e) => setField(e.target.value)}
                    placeholder="e.g. Computer Science" className="cos-input mt-2" />
                </div>
                <div>
                  <label htmlFor="setup-institution" className="cos-label">Institution</label>
                  <input id="setup-institution" value={institution} onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Universiti Malaya" className="cos-input mt-2" />
                </div>
                <div>
                  <label htmlFor="setup-gradyear" className="cos-label">Graduation year</label>
                  <input id="setup-gradyear" type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                    placeholder="e.g. 2022" className="cos-input mt-2" />
                </div>
              </div>
            </section>

            {/* Current situation */}
            <section className="cos-card p-6 flex flex-col gap-4">
              <h2 className="cos-eyebrow-teal">Current situation</h2>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="setup-jobtitle" className="cos-label">Current job title</label>
                  <input id="setup-jobtitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Sales Executive" className="cos-input mt-2" />
                </div>
                <div>
                  <label htmlFor="setup-employer" className="cos-label">Employer</label>
                  <input id="setup-employer" value={employer} onChange={(e) => setEmployer(e.target.value)}
                    placeholder="e.g. Acme Sdn Bhd" className="cos-input mt-2" />
                </div>
                <div>
                  <label htmlFor="setup-yrsexp" className="cos-label">Years of experience</label>
                  <input id="setup-yrsexp" type="number" min="0" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)}
                    placeholder="e.g. 2" className="cos-input mt-2" />
                </div>
                <div>
                  <label htmlFor="setup-visibility" className="cos-label">Visibility</label>
                  <div className="relative mt-2">
                    <select id="setup-visibility" value={visibility}
                      onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                      className="cos-select">
                      {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tx-mute)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>
              </div>

              <div className="cos-surfaced">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="setup-underemployed"
                    checked={underemployed}
                    onChange={(e) => setUnderemployed(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-[var(--teal)] flex-shrink-0"
                  />
                  <label htmlFor="setup-underemployed" className="cursor-pointer">
                    <p className="text-[14px] font-medium text-[var(--tx)]">
                      I'm currently working in a role that doesn't reflect my qualification level.
                    </p>
                    <p className="text-[12.5px] text-[var(--tx-mute)] mt-1 leading-relaxed">
                      Many qualified people land in this situation. Flagging this helps us surface you based on what you're actually capable of.
                    </p>
                  </label>
                </div>
              </div>
            </section>

            {/* Career intent */}
            <section className="cos-card p-6">
              <h2 className="cos-eyebrow-teal mb-1">Where you're heading</h2>
              <p className="text-[12.5px] text-[var(--tx-mute)] mb-4 leading-relaxed">
                What kind of work do you want to be doing? Be specific — this shapes how we assess your trajectory.
              </p>
              <div className="cos-textarea-soft">
                <textarea
                  id="setup-career-intent"
                  aria-label="Career intent"
                  value={careerIntent}
                  onChange={(e) => setCareerIntent(e.target.value)}
                  rows={3}
                  placeholder="e.g. I want to move into data analytics. I've been building Python and SQL skills on the side and want to work in a role where I can own the analytics function."
                />
              </div>
            </section>

            {/* Skills */}
            <section className="cos-card p-6 flex flex-col gap-4">
              <h2 className="cos-eyebrow-teal">Skills</h2>
              <div className="flex gap-2.5 items-center">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder="Skill name (e.g. Python)"
                  aria-label="Skill name"
                  className="cos-input flex-1"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={skillYears}
                  onChange={(e) => setSkillYears(e.target.value)}
                  aria-label="Years of experience with this skill"
                  placeholder="yrs"
                  className="cos-input-sm"
                />
                <button type="button" onClick={addSkill} className="cos-btn-teal-sm">Add</button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <Chip key={i} label={`${s.name} · ${s.years}yr`} onRemove={() => setSkills((p) => p.filter((_, j) => j !== i))} />
                  ))}
                </div>
              )}
            </section>

            {/* Projects */}
            <section className="cos-card p-6 flex flex-col gap-4">
              <div>
                <h2 className="cos-eyebrow-teal">Projects & self-directed work</h2>
                <p className="text-[12.5px] text-[var(--tx-mute)] mt-1">Side projects, freelance work, self-study outputs, open source contributions.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <input
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="Project title"
                  aria-label="Project title"
                  className="cos-input"
                />
                <div className="cos-textarea-soft">
                  <textarea
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    rows={2}
                    aria-label="Project description"
                    placeholder="What did you build and what did you learn?"
                  />
                </div>
                <div className="flex gap-2.5 items-center">
                  <input
                    value={projUrl}
                    onChange={(e) => setProjUrl(e.target.value)}
                    placeholder="URL (optional)"
                    aria-label="Project URL"
                    className="cos-input flex-1"
                  />
                  <button type="button" onClick={addProject} className="cos-btn-teal-sm">Add</button>
                </div>
              </div>
              {projects.length > 0 && (
                <div className="flex flex-col gap-2">
                  {projects.map((p, i) => (
                    <div key={i} className="cos-card-md flex items-start justify-between gap-3 p-4">
                      <div>
                        <p className="text-[13.5px] font-semibold text-[var(--tx)]">{p.title}</p>
                        {p.description && <p className="text-[12px] text-[var(--tx-mute)] mt-0.5">{p.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setProjects((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove project ${p.title}`}
                        className="text-[12px] text-[var(--tx-mute)] hover:text-[var(--red)] bg-transparent border-none cursor-pointer flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Certifications */}
            <section className="cos-card p-6 flex flex-col gap-4">
              <div>
                <h2 className="cos-eyebrow-teal">Certifications</h2>
                <p className="text-[12.5px] text-[var(--tx-mute)] mt-1">Formal certifications, online course completions, professional qualifications.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <input
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  placeholder="Certification name (e.g. Google Data Analytics Certificate)"
                  aria-label="Certification name"
                  className="cos-input"
                />
                <div className="flex gap-2.5">
                  <input
                    value={certIssuer}
                    onChange={(e) => setCertIssuer(e.target.value)}
                    placeholder="Issuer (e.g. Google / Coursera)"
                    aria-label="Certification issuer"
                    className="cos-input flex-1"
                  />
                  <input
                    type="number"
                    value={certYear}
                    onChange={(e) => setCertYear(e.target.value)}
                    placeholder="Year"
                    aria-label="Certification year"
                    className="cos-input-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!certName.trim()) return
                      setCertifications((prev) => [...prev, { name: certName.trim(), issuer: certIssuer.trim(), year: certYear }])
                      setCertName(''); setCertIssuer(''); setCertYear('')
                    }}
                    className="cos-btn-teal-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
              {certifications.length > 0 && (
                <div className="flex flex-col gap-2">
                  {certifications.map((c, i) => (
                    <div key={i} className="cos-card-md flex items-start justify-between gap-3 p-4">
                      <div>
                        <p className="text-[13.5px] font-semibold text-[var(--tx)]">{c.name}</p>
                        <p className="text-[12px] text-[var(--tx-mute)] mt-0.5">
                          {[c.issuer, c.year].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCertifications((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove certification ${c.name}`}
                        className="text-[12px] text-[var(--tx-mute)] hover:text-[var(--red)] bg-transparent border-none cursor-pointer flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

            <button type="submit" className="cos-btn-teal w-full text-[16px] py-4 justify-center">
              Build my capability profile
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}
