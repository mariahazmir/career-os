import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      const role = context.auth.session.user.user_metadata?.role as string | undefined
      throw redirect({ to: role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) { setError(signInError.message); return }
    const role = data.user?.user_metadata?.role as string | undefined
    await navigate({ to: role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard' })
  }

  return (
    <div className="cos-page flex items-center justify-center">
      <div className="cos-aurora-role" />
      <div className="cos-layer w-full max-w-sm px-5">
        <div className="flex items-center gap-2.5 mb-9 justify-center">
          <div className="cos-brand-mark"><div className="cos-brand-tri" /></div>
          <span className="text-[17px] font-semibold text-[var(--tx)] tracking-tight">Career<span className="cos-brand-sub">OS</span></span>
        </div>

        <div className="cos-card-2 p-9">
          <h1 className="text-2xl font-semibold text-[var(--tx)] tracking-tight mb-1.5">Sign in</h1>
          <p className="text-[13.5px] text-[var(--tx-mute)] mb-7">Welcome back to Career OS</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="cos-label">Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cos-input"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="cos-label">Password</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cos-input"
              />
            </div>

            {error && <p className="text-[13.5px] text-[var(--red)]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="cos-btn-orange w-full justify-center mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[var(--tx-mute)] mt-5">
            No account?{' '}
            <a href="/signup" className="text-[var(--teal)] no-underline hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  )
}
