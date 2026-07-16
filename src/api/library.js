import { supabase } from '../lib/supabase'
import {
  programFromDb, programToDb,
  dietPlanFromDb, dietPlanToDb,
  questionnaireFromDb, questionnaireToDb,
  foodFromDb, foodToDb,
  recipeFromDb, recipeToDb,
  documentFromDb, exerciseFromDb,
} from './mappers'

// Fábrica de CRUD: todas estas tablas comparten la misma forma.
const crud = (table, fromDb, toDb) => ({
  async list(coachId) {
    const { data, error } = await supabase.from(table).select('*').eq('coach_id', coachId)
    if (error) throw error
    return (data ?? []).map(fromDb)
  },
  async save(item, coachId) {
    const row = toDb(item, coachId)
    if (!row.id) delete row.id                 // deja que Postgres genere el uuid
    const { data, error } = await supabase.from(table).upsert(row).select().single()
    if (error) throw error
    return fromDb(data)
  },
  async remove(id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  },
})

export const programs = crud('programs', programFromDb, programToDb)
export const dietPlans = crud('diet_plans', dietPlanFromDb, dietPlanToDb)
export const questionnaires = crud('questionnaires', questionnaireFromDb, questionnaireToDb)
export const foods = crud('foods', foodFromDb, foodToDb)
export const recipes = crud('recipes', recipeFromDb, recipeToDb)

/** Ejercicios: los globales (coach_id null) más los del coach. Incluye cardio. */
export async function listExercises(coachId) {
  const { data, error } = await supabase
    .from('exercises').select('*')
    .or(`coach_id.is.null,coach_id.eq.${coachId}`)
    .order('name')
  if (error) throw error
  return (data ?? []).map(exerciseFromDb)
}

// ---------------------------------------------------------------
// Documentos: archivo real subido a Storage, no una liga de Drive.
// ---------------------------------------------------------------
export const documents = {
  async list(coachId) {
    const { data, error } = await supabase
      .from('documents').select('*').eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(documentFromDb)
  },

  /** Sube el archivo al bucket y registra la fila. */
  async upload(file, meta, coachId) {
    const path = `${coachId}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) throw upErr

    const { data, error } = await supabase.from('documents').insert({
      coach_id: coachId,
      client_id: meta.clientId ?? null,
      title: meta.title,
      category: meta.category ?? '',
      description: meta.description ?? '',
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
    }).select().single()
    if (error) throw error
    return documentFromDb(data)
  },

  async update(id, patch) {
    const { data, error } = await supabase.from('documents').update({
      title: patch.title,
      category: patch.category,
      description: patch.description,
      client_id: patch.clientId ?? null,
    }).eq('id', id).select().single()
    if (error) throw error
    return documentFromDb(data)
  },

  /** Borra la fila y el archivo del bucket. */
  async remove(doc) {
    if (doc.storagePath) await supabase.storage.from('documents').remove([doc.storagePath])
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) throw error
  },

  /** Liga temporal para ver o descargar el archivo (bucket privado). */
  async signedUrl(storagePath, seconds = 3600) {
    const { data, error } = await supabase.storage
      .from('documents').createSignedUrl(storagePath, seconds)
    if (error) throw error
    return data.signedUrl
  },
}
