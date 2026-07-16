import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Motor de guardado.
 *
 * Las cuatro reglas que la app vieja rompía:
 *  1. Supabase es la única verdad. Nada se da por guardado hasta que responde.
 *  2. Guardado optimista CON REVERSA: si la nube rechaza, se deshace el cambio
 *     en pantalla y se avisa. Nunca un "guardado" mentiroso.
 *  3. Ningún error se traga. Todos suben al estado `error` y se muestran.
 *  4. Siempre hay estado: idle | loading | saving | saved | error.
 *
 * Uso:
 *   const clients = useResource({
 *     load:   () => listClients(coachId),
 *     save:   (c) => updateClient(c.id, c),
 *     remove: (c) => removeClient(c.id),
 *   })
 */
export function useResource({ load, save, remove, enabled = true }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const alive = useRef(true)
  const savedTimer = useRef(null)

  useEffect(() => () => { alive.current = false; clearTimeout(savedTimer.current) }, [])

  const flashSaved = useCallback(() => {
    if (!alive.current) return
    setStatus('saved')
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => alive.current && setStatus('idle'), 2000)
  }, [])

  const refresh = useCallback(async () => {
    if (!enabled) return
    setStatus('loading')
    setError(null)
    try {
      const data = await load()
      if (alive.current) { setItems(data); setStatus('idle') }
    } catch (e) {
      if (alive.current) { setError(readable(e)); setStatus('error') }
    }
  }, [load, enabled])

  useEffect(() => { refresh() }, [refresh])

  /** Guarda (crea o actualiza). Pinta primero, revierte si falla. */
  const commit = useCallback(async (item) => {
    const previous = items
    const isNew = !item.id
    setItems((prev) =>
      isNew ? [...prev, { ...item, id: '__tmp__' }]
            : prev.map((i) => (i.id === item.id ? { ...i, ...item } : i))
    )
    setStatus('saving')
    setError(null)

    try {
      const saved = await save(item)
      if (!alive.current) return saved
      setItems((prev) =>
        isNew ? prev.map((i) => (i.id === '__tmp__' ? saved : i))
              : prev.map((i) => (i.id === saved.id ? saved : i))
      )
      flashSaved()
      return saved
    } catch (e) {
      if (alive.current) {
        setItems(previous)              // ← la reversa: nada de guardados falsos
        setError(readable(e))
        setStatus('error')
      }
      throw e
    }
  }, [items, save, flashSaved])

  /** Elimina. Igual: optimista con reversa. */
  const destroy = useCallback(async (item) => {
    if (!remove) return
    const previous = items
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    setStatus('saving')
    setError(null)

    try {
      await remove(item)
      flashSaved()
    } catch (e) {
      if (alive.current) {
        setItems(previous)
        setError(readable(e))
        setStatus('error')
      }
      throw e
    }
  }, [items, remove, flashSaved])

  return {
    items, status, error, refresh, commit, destroy,
    isLoading: status === 'loading',
    isSaving: status === 'saving',
  }
}

/** Traduce el error crudo de Postgres a algo que un humano entienda. */
export function readable(e) {
  const msg = e?.message ?? String(e)

  if (/row-level security|violates row-level/i.test(msg))
    return 'No tienes permiso para guardar esto. Revisa las políticas de acceso.'
  if (/duplicate key|unique constraint/i.test(msg))
    return 'Ya existe un registro con esos datos.'
  if (/foreign key/i.test(msg))
    return 'Ese registro depende de otro que ya no existe.'
  if (/failed to fetch|network/i.test(msg))
    return 'Sin conexión. Tu cambio no se guardó.'
  if (/jwt|not authenticated|session/i.test(msg))
    return 'Tu sesión expiró. Vuelve a iniciar sesión.'

  return msg
}
