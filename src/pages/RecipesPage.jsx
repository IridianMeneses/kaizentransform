import { useCallback, useState } from 'react'
import { recipes as recipesApi } from '../api/library'
import { kcalFromMacros } from '../api/mappers'
import { useResource } from '../lib/useResource'
import SaveStatus from '../components/SaveStatus'

const MEAL_TIMES = ['Desayuno', 'Colación 1', 'Comida', 'Colación 2', 'Cena']
const DIFFICULTIES = ['fácil', 'media', 'difícil']

const empty = (author) => ({
  title: '', mealTime: 'Desayuno', difficulty: 'fácil', tags: [],
  ingredients: [''], steps: [''], author,
  macros: { protein: 0, carbs: 0, fat: 0 },
})

export default function RecipesPage({ coachId, coachName }) {
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => recipesApi.list(coachId), [coachId])
  const save = useCallback((r) => recipesApi.save(r, coachId), [coachId])
  const remove = useCallback((r) => recipesApi.remove(r.id), [])
  const { items, status, error, refresh, commit, destroy } = useResource({
    load, save, remove, enabled: !!coachId,
  })

  return (
    <section>
      <header style={S.header}>
        <h2 style={S.h2}>Recetas</h2>
        <button style={S.primary} onClick={() => setEditing(empty(coachName))}>+ Nueva receta</button>
      </header>

      <SaveStatus status={status} error={error} onRetry={refresh} />

      {items.length === 0 ? (
        <p style={S.muted}>Aún no tienes recetas.</p>
      ) : (
        <ul style={S.grid}>
          {items.map((r) => (
            <li key={r.id} style={S.card}>
              <div style={S.cardTop}>
                <div style={S.tags}>
                  {r.difficulty && <span style={S.tag}>{r.difficulty}</span>}
                  {r.mealTime && <span style={S.tag}>{r.mealTime}</span>}
                </div>
                <strong style={S.cardTitle}>{r.title}</strong>
                <div style={S.muted}>
                  {kcalFromMacros(r.macros ?? {})} kcal · Por: {r.author || '—'}
                </div>
              </div>
              <div style={S.row}>
                {/* Opción "editar" que la app anterior no tenía. */}
                <button style={S.ghost} onClick={() => setEditing(r)}>Editar</button>
                <button style={S.danger} onClick={() => destroy(r).catch(() => {})}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <RecipeEditor
          recipe={editing}
          status={status}
          error={error}
          onSave={async (r) => { await commit(r); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function RecipeEditor({ recipe, status, error, onSave, onClose }) {
  const [draft, setDraft] = useState(recipe)
  const [msg, setMsg] = useState('')

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const setMacro = (k) => (e) =>
    setDraft((d) => ({ ...d, macros: { ...d.macros, [k]: Number(e.target.value || 0) } }))

  const setLine = (field, i, value) =>
    setDraft((d) => ({ ...d, [field]: d[field].map((x, j) => (j === i ? value : x)) }))
  const addLine = (field) => setDraft((d) => ({ ...d, [field]: [...d[field], ''] }))
  const removeLine = (field, i) =>
    setDraft((d) => ({ ...d, [field]: d[field].filter((_, j) => j !== i) }))

  const submit = async () => {
    if (!draft.title.trim()) return setMsg('Ponle título a la receta.')
    const clean = {
      ...draft,
      ingredients: draft.ingredients.filter((x) => x.trim()),
      steps: draft.steps.filter((x) => x.trim()),
    }
    try { await onSave(clean) } catch (e) { setMsg(e.message) }
  }

  const kcal = kcalFromMacros(draft.macros ?? {})

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={S.h2}>{draft.id ? 'Editar receta' : 'Nueva receta'}</h3>

        <SaveStatus status={status} error={error} />

        <label style={S.label}>Título
          <input style={S.input} value={draft.title} onChange={set('title')} autoFocus />
        </label>

        <div style={S.grid2}>
          <label style={S.label}>Tiempo de comida
            <select style={S.input} value={draft.mealTime} onChange={set('mealTime')}>
              {MEAL_TIMES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label style={S.label}>Dificultad
            <select style={S.input} value={draft.difficulty} onChange={set('difficulty')}>
              {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <p style={{ ...S.label, marginTop: 18 }}>Macros ({kcal} kcal)</p>
        <div style={S.grid3}>
          <label style={S.label}>Proteína (g)
            <input style={S.input} type="number" min="0" value={draft.macros?.protein ?? 0} onChange={setMacro('protein')} />
          </label>
          <label style={S.label}>Carbos (g)
            <input style={S.input} type="number" min="0" value={draft.macros?.carbs ?? 0} onChange={setMacro('carbs')} />
          </label>
          <label style={S.label}>Grasas (g)
            <input style={S.input} type="number" min="0" value={draft.macros?.fat ?? 0} onChange={setMacro('fat')} />
          </label>
        </div>

        <Lines
          title="Ingredientes" field="ingredients" values={draft.ingredients}
          onChange={setLine} onAdd={addLine} onRemove={removeLine} placeholder="2 huevos"
        />
        <Lines
          title="Preparación" field="steps" values={draft.steps}
          onChange={setLine} onAdd={addLine} onRemove={removeLine} placeholder="Bate los huevos…"
        />

        {msg && <p style={S.error}>{msg}</p>}

        <div style={S.actions}>
          <button style={S.primary} onClick={submit} disabled={status === 'saving'}>
            {status === 'saving' ? 'Guardando…' : 'Guardar receta'}
          </button>
          <button style={S.ghost} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

const Lines = ({ title, field, values, onChange, onAdd, onRemove, placeholder }) => (
  <>
    <p style={{ ...S.label, marginTop: 18 }}>{title}</p>
    {values.map((v, i) => (
      <div key={i} style={S.lineRow}>
        <input
          style={S.input} value={v} placeholder={placeholder}
          onChange={(e) => onChange(field, i, e.target.value)}
        />
        {values.length > 1 && (
          <button style={S.linkDanger} onClick={() => onRemove(field, i)} aria-label="Quitar">×</button>
        )}
      </div>
    ))}
    <button style={S.ghost} onClick={() => onAdd(field)}>+ Agregar</button>
  </>
)

const S = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h2: { color: 'var(--red)', margin: 0 },
  muted: { color: 'var(--muted)', fontSize: 13 },
  error: { color: 'var(--red-hi)', fontSize: 13 },
  grid: { listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 },
  cardTop: { flex: 1 },
  cardTitle: { display: 'block', fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 6 },
  tags: { display: 'flex', gap: 6 },
  tag: { fontSize: 11, color: 'var(--muted)', background: '#1E1E1E', borderRadius: 999, padding: '2px 10px' },
  row: { display: 'flex', gap: 8 },
  lineRow: { display: 'flex', gap: 8, alignItems: 'center' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: 10 },
  label: { display: 'block', marginTop: 12, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  input: { display: 'block', width: '100%', marginTop: 6, background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' },
  overlay: { position: 'fixed', inset: 0, background: '#000C', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto' },
  actions: { display: 'flex', gap: 8, marginTop: 20 },
  primary: { background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, flex: 1 },
  ghost: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, marginTop: 8 },
  danger: { background: 'transparent', color: 'var(--red-hi)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 },
  linkDanger: { background: 'transparent', color: 'var(--muted)', border: 0, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 6px' },
}
