import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { getProfile } from '@/services/auth.service'

export function useAuthListener() {
  const { setUser, setSession, setProfile, setLoading, clear } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        try {
          const profile = await getProfile(session.user.id)
          setProfile(profile)
        } catch {
          // profile may not exist yet
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            const profile = await getProfile(session.user.id)
            setProfile(profile)
          } catch {
            // profile may not exist yet
          }
        } else {
          clear()
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setProfile, setLoading, clear])
}
