import { supabase } from '../lib/supabase'
import { clientFromDb, clientToDb } from './mappers'

/**
 * Flujo único de alta: el coach invita → la persona se registra →
 * el trigger de Postgres crea su perfil y su ficha, ligada a este coach.
 * No hay alta directa: un solo camino, menos formas de romperse.
 */

/** Clientes del coach. Los eliminados no se muestran (pero nunca se borran). */
export async function listClients(coachId, { includeDeleted = false } = {}) {
  let q = supabase.from('clients').select('*').eq('coach_id', coachId)
  if (!includeDeleted) q = q.neq('status', 'eliminado')
  const { data, error } = await q.order('name')
  if (error) throw error
  return (data ?? []).map(clientFromDb)
}

/** La ficha del propio paciente. */
export async function getMyClient(userId) {
  const { data, error } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data ? clientFromDb(data) : null
}

async function fetchClient(clientId) {
  const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single()
  if (error) throw error
  return clientFromDb(data)
}

/**
 * Guarda cambios parciales de un cliente.
 *
 * Lee-modifica-escribe sobre la fila completa. Esto es exactamente lo que
 * arregla el bug original: el guardado viejo armaba el objeto a mano y
 * olvidaba campos (measures, stepsHistory), que se perdían al recargar.
 */
export async function updateClient(clientId, patch) {
  const current = await fetchClient(clientId)
  const merged = { ...current, ...patch }

  const { data, error } = await supabase
    .from('clients').update(clientToDb(merged)).eq('id', clientId).select().single()
  if (error) throw error
  return clientFromDb(data)
}

/** Baja lógica: conserva historial y permite reactivar (RN-C05/C06). */
export const setClientStatus = (clientId, status) => updateClient(clientId, { status })

/** Una medida por mes (RN-C11). */
export async function addMeasure(clientId, measure) {
  const c = await fetchClient(clientId)
  const month = (measure.date ?? new Date().toISOString().slice(0, 10)).slice(0, 7)

  if ((c.measures ?? []).some((m) => (m.date ?? '').slice(0, 7) === month)) {
    throw new Error('Ya existe una medida registrada este mes.')
  }
  const measures = [...(c.measures ?? []), measure].sort((a, b) => a.date.localeCompare(b.date))
  return updateClient(clientId, { measures })
}

/** Un registro de pasos por día: el mismo día se reemplaza (RN-15/16). */
export async function saveSteps(clientId, date, steps) {
  const c = await fetchClient(clientId)
  const stepsHistory = [
    ...(c.stepsHistory ?? []).filter((s) => s.date !== date),
    { date, steps },
  ].sort((a, b) => a.date.localeCompare(b.date))
  return updateClient(clientId, { stepsHistory })
}

/** Liga de invitación por WhatsApp. */
export const invitationLink = (phone, name, appUrl) =>
  `https://wa.me/${(phone || '').replace(/\D/g, '')}?text=` +
  encodeURIComponent(`Hola ${name}! 👋 Crea tu cuenta en Kaizen Coach aquí:\n\n${appUrl}`)
