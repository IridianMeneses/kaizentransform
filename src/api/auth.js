import { supabase } from '../lib/supabase'

/** Registro. El trigger de Postgres crea el perfil y la ficha; siempre como paciente. */
export async function signUp({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { name } },
  })
  if (error) throw new Error(traducir(error.message))
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  // Mensaje genérico a propósito: no revela qué campo falló (RN-F1-04).
  if (error) throw new Error('Email o contraseña incorrectos.')
  return data
}

export const signOut = () => supabase.auth.signOut()

export const requestPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })

export const updatePassword = (password) => supabase.auth.updateUser({ password })

/**
 * Perfil del usuario en sesión.
 * Si el perfil no existe todavía, el rol es 'patient' — nunca 'coach'.
 * (El bundle viejo caía en 'coach' aquí y daba acceso indebido.)
 */
export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error

  return {
    id: user.id,
    email: user.email,
    name: data?.name ?? user.email.split('@')[0],
    role: data?.role ?? 'patient',
    avatarUrl: data?.avatar_url ?? null,
  }
}

export const onAuthChange = (cb) =>
  supabase.auth.onAuthStateChange((event, session) => cb(event, session))

const traducir = (msg = '') => {
  if (/already registered|already exists/i.test(msg)) return 'Ese correo ya está registrado.'
  if (/password/i.test(msg)) return 'La contraseña no cumple los requisitos mínimos.'
  if (/failed to fetch/i.test(msg)) return 'No se pudo conectar. Revisa tu conexión.'
  return 'No se pudo completar el registro. Inténtalo de nuevo.'
}
