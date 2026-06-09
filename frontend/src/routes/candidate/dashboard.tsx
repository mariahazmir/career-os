import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useAuth } from '../../contexts/auth'

export const Route = createFileRoute('/candidate/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
  },
  component: CandidateDashboard,
})

function CandidateDashboard() {
  const { session, signOut } = useAuth()
  const email = session?.user.email ?? ''
  const initials = email.slice(0, 2).toUpperCase()

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
            <Link to="/candidate/profile/capability" className="cos-nav-link">Profile</Link>
            <Link to="/candidate/dashboard" className="cos-nav-link active">Dashboard</Link>
          </nav>
          <div className="cos-av-xs ml-2">{initials}</div>
          <button type="button" onClick={signOut} className="cos-btn-ghost-sm ml-1">
            Sign out
          </button>
        </header>

        <main className="max-w-[720px] mx-auto px-8 pb-24 pt-10">
          <div className="mb-9">
            <div className="cos-eyebrow-teal mb-3">Dashboard</div>
            <h1 className="cos-h1">Welcome back</h1>
            <p className="text-[15px] text-[var(--tx-dim)] mt-3">{email}</p>
          </div>

          <div className="flex flex-col gap-3.5">
            <Link to="/candidate/matches"
              className="cos-card p-7 block no-underline hover:border-[var(--teal)] transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-semibold text-[var(--tx)] mb-1.5">View my matches</p>
                  <p className="text-[13.5px] text-[var(--tx-mute)] leading-relaxed">
                    See employers who matched on your capability and decide whether to engage.
                  </p>
                </div>
                <svg className="w-5 h-5 text-[var(--teal)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </div>
            </Link>

            <Link to="/candidate/profile/capability"
              className="cos-card p-7 block no-underline hover:border-[var(--line-2)] transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-semibold text-[var(--tx)] mb-1.5">View my capability profile</p>
                  <p className="text-[13.5px] text-[var(--tx-mute)] leading-relaxed">
                    See how the platform reads your skills, confidence levels, and trajectory signal.
                  </p>
                </div>
                <svg className="w-5 h-5 text-[var(--tx-mute)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </div>
            </Link>

            <Link to="/candidate/profile/setup"
              className="cos-card p-7 block no-underline hover:border-[var(--line-2)] transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-semibold text-[var(--tx)] mb-1.5">Build / update my profile</p>
                  <p className="text-[13.5px] text-[var(--tx-mute)] leading-relaxed">
                    Add education, skills, and career intent so the platform can accurately represent your capabilities.
                  </p>
                </div>
                <svg className="w-5 h-5 text-[var(--tx-mute)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </div>
            </Link>
          </div>

          <p className="text-center text-[12.5px] text-[var(--tx-mute)] mt-10 leading-relaxed">
            Your profile is only visible to employers the platform selects — never publicly listed.
          </p>
        </main>
      </div>
    </div>
  )
}
