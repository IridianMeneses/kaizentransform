import { useEffect, useState } from 'react'
import { getProfile, onAuthChange } from '../api/auth'

/**
 * Sesión y perfil. `loading` es importante: mientras es true no se
 * renderiza ninguna vista, lo que evita el "pantallazo negro" que
 * daba la app vieja al pintar antes de tener datos.
 */
export function useSession() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const p = await getProfile()
        if (alive) setProfile(p)
      } catch {
        if (alive) setProfile(null)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const { data: sub } = onAuthChange(() => load())
    return () => { alive = false; sub?.subscription?.unsubscribe() }
  }, [])

  return {
    profile,
    loading,
    isCoach: profile?.role === 'coach',
    isPatient: profile?.role === 'patient',
  }
}
