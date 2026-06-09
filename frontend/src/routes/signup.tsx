import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      const role = context.auth.session.user.user_metadata?.role as string | undefined
      throw redirect({ to: role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard' })
    }
  },
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })
    setLoading(false)
    if (signupError) { setError(signupError.message); return }
    await navigate({ to: role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard' })
  }

  return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora" />
      <div className="cos-layer w-full max-w-[400px] px-5">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
            <span className="text-[18px] font-semibold text-[var(--tx)] tracking-tight">
              Career<span className="text-[var(--tx-mute)] font-medium">OS</span>
            </span>
          </div>
          <p className="text-[13px] text-[var(--tx-mute)]">Create your account</p>
        </div>

        <div className="cos-card-2 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Role toggle */}
            <div>
              <p className="text-[12px] font-semibold text-[var(--tx-mute)] uppercase tracking-wider mb-3">I am a…</p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('candidate')}
                  className={role === 'candidate' ? 'cos-btn-teal flex-1' : 'cos-btn-ghost flex-1'}
                >
                  Job seeker
                </button>
                <button
                  type="button"
                  onClick={() => setRole('employer')}
                  className={role === 'employer' ? 'cos-btn-orange flex-1' : 'cos-btn-ghost flex-1'}
                >
                  Employer
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="signup-name" className="cos-label">Full name</label>
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="cos-input mt-2"
                placeholder="e.g. Alex Ramli"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="cos-label">Email</label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cos-input mt-2"
                placeholder="you@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="cos-label">Password</label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cos-input mt-2"
                placeholder="min. 6 characters"
              />
            </div>

            {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full disabled:opacity-50 ${role === 'employer' ? 'cos-btn-orange' : 'cos-btn-teal'}`}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[var(--tx-mute)] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--teal)] no-underline hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
