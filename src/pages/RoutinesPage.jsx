import { useCallback, useEffect, useMemo, useState } from 'react'
import { programs, listExercises } from '../api/library'
import { useResource } from '../lib/useResource'
import SaveStatus from '../components/SaveStatus'

const REP_RANGES = ['5-10', '6-8', '8-12', '10-15', '12-15', '15-20', '20+', 'Al fallo']
const RIR = ['0-1 · al fallo', '1-2 · cercano', '2-3 · moderado-cercano', '3-4 · moderado', '4+ · lejano']

const emptyExercise = () => ({ name: '', sets: 3, reps: '8-12', rir: '2-3 · moderado-cercano', rest: '2 min', note: '' })
const emptyDay = () => ({ name: 'Día 1', exercises: [emptyExercise()] })

export default function RoutinesPage({ coachId }) {
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => programs.list(coachId), [coachId])
  const save = useCallback((p) => programs.save(p, coachId), [coachId])
  const remove = useCallback((p) => programs.remove(p.id), [])
  const { items, status, error, refresh, commit, destroy } = useResource({
    load, save, remove, enabled: !!coachId,
  })

  if (editing) {
    return (
      <RoutineEditor
        coachId={coachId}
        routine={editing}
        status={status}
        error={error}
        onSave={async (r) => { await commit(r); setEditing(null) }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <section>
      <header style={S.header}>
        <h2 style={S.h2}>Rutinas</h2>
        <button style={S.primary} onClick={() => setEditing({ name: '', days: [emptyDay()] })}>
          + Nueva rutina
        </button>
      </header>

      <SaveStatus status={status} error={error} onRetry={refresh} />

      {items.length === 0 ? (
        <p style={S.muted}>Aún no tienes rutinas guardadas.</p>
      ) : (
        <ul style={S.list}>
          {items.map((p) => (
            <li key={p.id} style={S.card}>
              <div>
                <strong>{p.name || 'Sin nombre'}</strong>
                <div style={S.muted}>
                  {p.days.length} día{p.days.length !== 1 && 's'} ·{' '}
                  {p.days.reduce((n, d) => n + d.exercises.length, 0)} ejercicios
                </div>
              </div>
              <div style={S.row}>
                <button style={S.ghost} onClick={() => setEditing(p)}>Editar</button>
                <button style={S.danger} onClick={() => destroy(p).catch(() => {})}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RoutineEditor({ coachId, routine, status, error, onSave, onCancel }) {
  const [draft, setDraft] = useState(routine)
  const [exercises, setExercises] = useState([])

  useEffect(() => {
    listExercises(coachId).then(setExercises).catch(() => setExercises([]))
  }, [coachId])

  const patchDay = (di, patch) =>
    setDraft((d) => ({ ...d, days: d.days.map((day, i) => (i === di ? { ...day, ...patch } : day)) }))

  const patchExercise = (di, ei, patch) =>
    patchDay(di, {
      exercises: draft.days[di].exercises.map((ex, i) => (i === ei ? { ...ex, ...patch } : ex)),
    })

  const addExercise = (di) => patchDay(di, { exercises: [...draft.days[di].exercises, emptyExercise()] })
  const removeExercise = (di, ei) =>
    patchDay(di, { exercises: draft.days[di].exercises.filter((_, i) => i !== ei) })

  const addDay = () =>
    setDraft((d) => ({ ...d, days: [...d.days, { ...emptyDay(), name: `Día ${d.days.length + 1}` }] }))

  return (
    <section>
      <header style={S.header}>
        <h2 style={S.h2}>{draft.id ? 'Editar rutina' : 'Nueva rutina'}</h2>
        <div style={S.row}>
          <button style={S.ghost} onClick={onCancel}>Cancelar</button>
          <button style={S.primary} onClick={() => onSave(draft)} disabled={status === 'saving'}>
            {status === 'saving' ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </header>

      <SaveStatus status={status} error={error} />

      <label style={S.label}>Nombre de la rutina
        <input
          style={S.input}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Ej: Fuerza — Semana 1"
        />
      </label>

      {draft.days.map((day, di) => (
        <div key={di} style={S.dayCard}>
          <input
            style={{ ...S.input, ...S.dayTitle }}
            value={day.name}
            onChange={(e) => patchDay(di, { name: e.target.value })}
          />

          {day.exercises.map((ex, ei) => (
            <ExerciseRow
              key={ei}
              index={ei}
              exercise={ex}
              options={exercises}
              onChange={(patch) => patchExercise(di, ei, patch)}
              onRemove={() => removeExercise(di, ei)}
            />
          ))}

          <button style={S.ghost} onClick={() => addExercise(di)}>+ Agregar ejercicio</button>
        </div>
      ))}

      <button style={S.ghost} onClick={addDay}>+ Agregar día</button>
    </section>
  )
}

/**
 * Fila de ejercicio.
 * Ajustes del PDF aplicados aquí:
 *  · No hay selector de categoría por ejercicio (se quitó).
 *  · Un solo campo de repeticiones (antes había dos, duplicados).
 * El buscador ofrece fuerza Y cardio, porque ahora los ejercicios
 * vienen de la base, no de un diccionario incompleto.
 */
function ExerciseRow({ index, exercise, options, onChange, onRemove }) {
  const [query, setQuery] = useState(exercise.name)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q === exercise.name.toLowerCase()) return []
    return options
      .filter((o) => o.name.toLowerCase().includes(q) || o.category.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, options, exercise.name])

  const pick = (o) => { onChange({ name: o.name }); setQuery(o.name) }

  return (
    <div style={S.exercise}>
      <div style={S.exerciseHead}>
        <span style={S.muted}>Ejercicio {index + 1}</span>
        <button style={S.linkDanger} onClick={onRemove}>Quitar</button>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          style={S.input}
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange({ name: e.target.value }) }}
          placeholder="Buscar ejercicio… (fuerza o cardio)"
        />
        {matches.length > 0 && (
          <ul style={S.dropdown}>
            {matches.map((o) => (
              <li key={o.id}>
                <button style={S.option} onClick={() => pick(o)}>
                  {o.name}
                  <span style={S.optionCat}>{o.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={S.grid3}>
        <Field label="Series">
          <input
            style={S.input} type="number" min="1" value={exercise.sets}
            onChange={(e) => onChange({ sets: Number(e.target.value) })}
          />
        </Field>

        {/* Un solo campo de reps. Antes existía además un input libre idéntico. */}
        <Field label="Reps / rango">
          <select style={S.input} value={exercise.reps} onChange={(e) => onChange({ reps: e.target.value })}>
            {REP_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>

        <Field label="RIR">
          <select style={S.input} value={exercise.rir} onChange={(e) => onChange({ rir: e.target.value })}>
            {RIR.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Descanso entre series">
        <input style={S.input} value={exercise.rest} onChange={(e) => onChange({ rest: e.target.value })} />
      </Field>

      <Field label="Nota de ejecución">
        <textarea
          style={{ ...S.input, minHeight: 60, resize: 'vertical' }}
          value={exercise.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Ej: Mantén el core apretado, controla la bajada 3 segundos…"
        />
      </Field>
    </div>
  )
}

const Field = ({ label, children }) => (
  <label style={S.label}>{label}{children}</label>
)

const S = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  h2: { color: 'var(--red)', margin: 0 },
  muted: { color: 'var(--muted)', fontSize: 13 },
  row: { display: 'flex', gap: 8 },
  list: { listStyle: 'none', padding: 0, display: 'grid', gap: 10 },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14,
  },
  dayCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 16, marginTop: 16,
  },
  dayTitle: { fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--red)', marginBottom: 12 },
  exercise: {
    background: '#0F0F0F', border: '1px solid var(--border)',
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  exerciseHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 },
  label: { display: 'block', marginTop: 10, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  input: {
    display: 'block', width: '100%', marginTop: 6, background: '#111',
    border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
    color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
  },
  dropdown: {
    position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, margin: '4px 0 0',
    padding: 0, listStyle: 'none', background: '#1A1A1A', border: '1px solid var(--border)',
    borderRadius: 8, maxHeight: 240, overflowY: 'auto',
  },
  option: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    width: '100%', textAlign: 'left', background: 'transparent', border: 0,
    color: 'var(--text)', padding: '10px 12px', cursor: 'pointer', fontSize: 13,
  },
  optionCat: { color: 'var(--muted)', fontSize: 11, flexShrink: 0 },
  primary: { background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
  ghost: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 },
  danger: { background: 'transparent', color: 'var(--red-hi)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 },
  linkDanger: { background: 'transparent', color: 'var(--muted)', border: 0, cursor: 'pointer', fontSize: 12 },
}
