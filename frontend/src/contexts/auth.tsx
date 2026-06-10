import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useRouter } from '@tanstack/react-router'

export interface AuthContext {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthContext>({
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const router = useRouter()

  const signOut = async () => {
    await supabase.auth.signOut()
    await router.navigate({ to: '/login' })
  }

  return (
    <AuthCtx.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
