import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { isSupabaseConfigured, supabase } from './supabase'

const DEMO_KEY = 'pantrypal-demo-mode'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [demo, setDemo] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const demoFlag = await AsyncStorage.getItem(DEMO_KEY)
        if (!supabase) {
          if (mounted) {
            setSession(null)
            setDemo(demoFlag === '1')
            setReady(true)
          }
          return
        }

        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        if (data.session) {
          setSession(data.session)
          setDemo(false)
          await AsyncStorage.removeItem(DEMO_KEY)
        } else {
          setSession(null)
          setDemo(demoFlag === '1')
        }
      } finally {
        if (mounted) setReady(true)
      }
    }

    bootstrap()

    if (!supabase) return () => { mounted = false }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        setDemo(false)
        AsyncStorage.removeItem(DEMO_KEY)
      }
    })

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh()
      else supabase.auth.stopAutoRefresh()
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
      appState.remove()
    }
  }, [])

  const value = useMemo(
    () => ({
      ready,
      session,
      demo,
      isSignedIn: Boolean(session) || demo,
      enterDemo: async () => {
        await AsyncStorage.setItem(DEMO_KEY, '1')
        setDemo(true)
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut()
        await AsyncStorage.removeItem(DEMO_KEY)
        setSession(null)
        setDemo(false)
      },
    }),
    [ready, session, demo],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export { isSupabaseConfigured }
