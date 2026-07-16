import { useCallback, useEffect, useMemo, useState } from 'react'
import { dietPlans, foods as foodsApi, recipes as recipesApi } from '../api/library'
import { kcalFromMacros } from '../api/mappers'
import { useResource } from '../lib/useResource'
import SaveStatus from '../components/SaveStatus'
import FoodModal from '../components/FoodModal'

const MEAL_TIMES = ['Desayuno', 'Colación 1', 'Comida', 'Colación 2', 'Cena']
const emptyPlan = () => ({ name: '', macros: { protein: 120, carbs: 130, fat: 60 }, meals: [] })

export default function DietsPage({ coachId }) {
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => dietPlans.list(coachId), [coachId])
  const save = useCallback((p) => dietPlans.save(p, coachId), [coachId])
  const remove = useCallback((p) => dietPlans.remove(p.id), [])
  const { items, status, error, refresh, commit, destroy } = useResource({
    load, save, remove, enabled: !!coachId,
  })

  if (editing) {
    return (
      <PlanEditor
        coachId={coachId} plan={editing} status={status} error={error}
        onSave={async (p) => { await commit(p); setEditing(null) }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <section>
      <header style={S.header}>
        <h2 style={S.h2}>Planes de alimentación</h2>
        <button style={S.primary} onClick={() => setEditing(emptyPlan())}>+ Nuevo plan</button>
      </header>

      <SaveStatus status={status} error={error} onRetry={refresh} />

      {items.length === 0 ? (
        <p style={S.muted}>Aún no tienes planes de alimentación.</p>
      ) : (
        <ul style={S.list}>
          {items.map((p) => (
            <li key={p.id} style={S.card}>
              <div>
                <strong>{p.name || 'Sin nombre'}</strong>
                <div style={S.muted}>
                  {kcalFromMacros(p.macros ?? {})} kcal · {p.meals.length} comidas
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

function PlanEditor({ coachId, plan, status, error, onSave, onCancel }) {
  const [draft, setDraft] = useState(plan)
  const [catalog, setCatalog] = useState({ foods: [], recipes: [] })
  const [showFoodModal, setShowFoodModal] = useState(false)
  const [mealTime, setMealTime] = useState('Desayuno')
  const [comment, setComment] = useState('')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState([])

  const reloadCatalog = useCallback(async () => {
    const [f, r] = await Promise.all([foodsApi.list(coachId), recipesApi.list(coachId)])
    setCatalog({ foods: f, recipes: r })
  }, [coachId])

  useEffect(() => { reloadCatalog().catch(() => {}) }, [reloadCatalog])

  // Buscador unificado: alimentos Y recetas (antes sólo alimentos).
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const f = catalog.foods.filter((x) => x.name.toLowerCase().includes(q))
      .map((x) => ({ ...x, kind: 'food' }))
    const r = catalog.recipes.filter((x) => x.title.toLowerCase().includes(q))
      .map((x) => ({ ...x, name: x.title, kind: 'recipe' }))
    return [...f, ...r].slice(0, 8)
  }, [query, catalog])

  const totals = useMemo(() => {
    const acc = { protein: 0, carbs: 0, fat: 0 }
    for (const m of draft.meals) for (const it of m.items) {
      const src = it.kind === 'recipe' ? (it.macros ?? {}) : it
      acc.protein += Number(src.protein ?? 0)
      acc.carbs += Number(src.carbs ?? 0)
      acc.fat += Number(src.fat ?? 0)
    }
    return acc
  }, [draft.meals])

  const target = draft.macros ?? {}
  const remaining = {
    protein: Math.max(0, (target.protein ?? 0) - totals.protein),
    carbs: Math.max(0, (target.carbs ?? 0) - totals.carbs),
    fat: Math.max(0, (target.fat ?? 0) - totals.fat),
  }

  const setMacro = (k) => (e) =>
    setDraft((d) => ({ ...d, macros: { ...d.macros, [k]: Number(e.target.value || 0) } }))

  const addMeal = () => {
    if (picked.length === 0) return
    setDraft((d) => ({ ...d, meals: [...d.meals, { time: mealTime, comment, items: picked }] }))
    setPicked([]); setComment(''); setQuery('')
  }

  return (
    <section>
      <header style={S.header}>
        <h2 style={S.h2}>{draft.id ? 'Editar plan' : 'Nuevo plan'}</h2>
        <div style={S.row}>
          <button style={S.ghost} onClick={onCancel}>Cancelar</button>
          <button style={S.primary} onClick={() => onSave(draft)} disabled={status === 'saving'}>
            {status === 'saving' ? 'Guardando…' : 'Guardar plan'}
          </button>
        </div>
      </header>

      <SaveStatus status={status} error={error} />

      <label style={S.label}>Nombre del plan
        <input style={S.input} value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Ej: Definición — 1500 kcal" />
      </label>

      {/* Objetivo de macros. Sin el chip de la fórmula: las kcal salen solas. */}
      <div style={S.macroGrid}>
        <MacroTarget label="🥩 Proteína" color="var(--green)" value={target.protein} onChange={setMacro('protein')} done={totals.protein} />
        <MacroTarget label="⚡ Carbos" color="#4A9EFF" value={target.carbs} onChange={setMacro('carbs')} done={totals.carbs} />
        <MacroTarget label="🥑 Grasas" color="var(--gold)" value={target.fat} onChange={setMacro('fat')} done={totals.fat} />
      </div>

      <div style={S.summary}>
        <div>
          <span style={S.muted}>✅ Llevas</span>
          <strong style={{ display: 'block', color: 'var(--green)' }}>
            {kcalFromMacros(totals)} kcal · P:{totals.protein}g · C:{totals.carbs}g · G:{totals.fat}g
          </strong>
        </div>
        <div>
          <span style={S.muted}>🎯 Faltan</span>
          <strong style={{ display: 'block', color: 'var(--gold)' }}>
            {kcalFromMacros(remaining)} kcal · P:{remaining.protein}g · C:{remaining.carbs}g · G:{remaining.fat}g
          </strong>
        </div>
      </div>

      {/* Buscador: alimentos y recetas */}
      <div style={S.panel}>
        <div style={S.panelHead}>
          <strong style={{ color: 'var(--red)' }}>🔍 Buscar alimento o receta</strong>
          <button style={S.ghost} onClick={() => setShowFoodModal(true)}>+ Añadir alimento</button>
        </div>

        <input style={S.input} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe un alimento o una receta…" />

        {results.length > 0 && (
          <ul style={S.results}>
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <button style={S.option} onClick={() => { setPicked((p) => [...p, r]); setQuery('') }}>
                  <span>{r.name}</span>
                  <span style={S.optionCat}>
                    {r.kind === 'recipe' ? '🍳 receta' : r.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {picked.length > 0 && (
          <ul style={S.picked}>
            {picked.map((p, i) => (
              <li key={i} style={S.pickedItem}>
                <span>{p.kind === 'recipe' ? '🍳 ' : ''}{p.name}</span>
                <button style={S.linkDanger} onClick={() => setPicked((xs) => xs.filter((_, j) => j !== i))}>×</button>
              </li>
            ))}
          </ul>
        )}

        <label style={S.label}>Tiempo de comida
          <select style={S.input} value={mealTime} onChange={(e) => setMealTime(e.target.value)}>
            {MEAL_TIMES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>

        <label style={S.label}>Comentarios
          <textarea style={{ ...S.input, minHeight: 60 }} value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ej: Tomar 30 min antes del ejercicio…" />
        </label>

        <button style={{ ...S.primary, width: '100%', marginTop: 12, opacity: picked.length ? 1 : .5 }}
          onClick={addMeal} disabled={!picked.length}>
          + Agregar {mealTime}
        </button>
      </div>

      {draft.meals.map((m, i) => (
        <div key={i} style={S.mealCard}>
          <div style={S.panelHead}>
            <strong>{m.time}</strong>
            <button style={S.linkDanger}
              onClick={() => setDraft((d) => ({ ...d, meals: d.meals.filter((_, j) => j !== i) }))}>
              Quitar
            </button>
          </div>
          <div style={S.muted}>{m.items.map((it) => it.name).join(' · ')}</div>
          {m.comment && <p style={S.comment}>{m.comment}</p>}
        </div>
      ))}

      {showFoodModal && (
        <FoodModal
          onClose={() => setShowFoodModal(false)}
          onSave={async (food) => {
            await foodsApi.save(food, coachId)
            await reloadCatalog()
            setShowFoodModal(false)
          }}
        />
      )}
    </section>
  )
}

const MacroTarget = ({ label, color, value = 0, onChange, done = 0 }) => (
  <div style={S.macroCard}>
    <span style={{ ...S.muted, display: 'block', textAlign: 'center' }}>{label}</span>
    <input
      style={{ ...S.input, borderColor: color, color, textAlign: 'center', fontSize: 22, fontWeight: 700 }}
      type="number" min="0" value={value} onChange={onChange}
    />
    <div style={{ ...S.muted, textAlign: 'center', marginTop: 6 }}>{done} / {value} g</div>
    <div style={S.barTrack}>
      <div style={{ ...S.barFill, width: `${Math.min(100, value ? (done / value) * 100 : 0)}%`, background: color }} />
    </div>
  </div>
)

const S = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  h2: { color: 'var(--red)', margin: 0 },
  muted: { color: 'var(--muted)', fontSize: 13 },
  row: { display: 'flex', gap: 8 },
  list: { listStyle: 'none', padding: 0, display: 'grid', gap: 10 },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 },
  macroGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginTop: 20 },
  macroCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 },
  barTrack: { height: 4, background: '#222', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, transition: 'width .2s' },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginTop: 12, fontSize: 13 },
  panel: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginTop: 20 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 },
  results: { listStyle: 'none', padding: 0, margin: '8px 0 0', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' },
  option: { display: 'flex', justifyContent: 'space-between', width: '100%', background: '#1A1A1A', border: 0, color: 'var(--text)', padding: '10px 12px', cursor: 'pointer', fontSize: 13, textAlign: 'left' },
  optionCat: { color: 'var(--muted)', fontSize: 11 },
  picked: { listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: 6 },
  pickedItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', borderRadius: 8, padding: '8px 12px', fontSize: 13 },
  mealCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, marginTop: 12 },
  comment: { ...{}, color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  label: { display: 'block', marginTop: 14, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  input: { display: 'block', width: '100%', marginTop: 6, background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' },
  primary: { background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
  ghost: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 },
  danger: { background: 'transparent', color: 'var(--red-hi)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 },
  linkDanger: { background: 'transparent', color: 'var(--muted)', border: 0, cursor: 'pointer', fontSize: 16 },
}
