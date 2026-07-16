import { useState } from 'react'
import { kcalFromMacros } from '../api/mappers'

const CATEGORIES = ['Lácteos', 'Proteínas', 'Cereales', 'Frutas', 'Verduras', 'Grasas', 'Bebidas', 'Otros']
const UNITS = ['g', 'ml', 'pieza', 'taza', 'vaso', 'cucharada', 'rebanada', 'porción']

const empty = {
  name: '', category: 'Otros', unit: 'g',
  portionG: 100, defaultQty: 1,
  protein: 0, carbs: 0, fat: 0,
}

/**
 * Alta y edición de alimentos.
 * Las kcal NO se capturan: se derivan de los macros (P×4 + C×4 + G×9).
 * Antes se escribían a mano y quedaban en 0, inconsistentes con los macros.
 */
export default function FoodModal({ food, onSave, onClose, saving }) {
  const [form, setForm] = useState(food ?? empty)
  const [error, setError] = useState('')

  const set = (k, numeric = false) => (e) =>
    setForm((f) => ({ ...f, [k]: numeric ? Number(e.target.value || 0) : e.target.value }))

  const kcal = kcalFromMacros(form)

  const submit = async () => {
    if (!form.name.trim()) return setError('Ponle nombre al alimento.')
    if (kcal === 0) return setError('Captura al menos un macronutriente.')
    try {
      await onSave({ ...form, kcal })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={S.h3}>{food ? 'Editar alimento' : 'Añadir alimento'}</h3>
        <p style={S.muted}>Los macros se ingresan por porción estándar.</p>

        <label style={S.label}>Nombre del alimento
          <input style={S.input} value={form.name} onChange={set('name')} autoFocus />
        </label>

        <div style={S.grid2}>
          <label style={S.label}>Categoría
            <select style={S.input} value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label style={S.label}>Unidad de medida
            <select style={S.input} value={form.unit} onChange={set('unit')}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>
        </div>

        <div style={S.grid2}>
          <label style={S.label}>Porción (g por unidad)
            <input style={S.input} type="number" min="0" value={form.portionG} onChange={set('portionG', true)} />
          </label>
          <label style={S.label}>Cantidad por defecto
            <input style={S.input} type="number" min="0" step="0.5" value={form.defaultQty} onChange={set('defaultQty', true)} />
          </label>
        </div>

        <p style={{ ...S.label, marginTop: 18 }}>Macros por porción</p>
        <div style={S.grid4}>
          <Macro label="🥩 Proteína (g)" color="var(--green)" value={form.protein} onChange={set('protein', true)} />
          <Macro label="⚡ Carbos (g)" color="#4A9EFF" value={form.carbs} onChange={set('carbs', true)} />
          <Macro label="🥑 Grasas (g)" color="var(--gold)" value={form.fat} onChange={set('fat', true)} />

          {/* Calculado, no capturado. */}
          <div>
            <span style={S.macroLabel}>🔥 Kcal</span>
            <output style={{ ...S.input, ...S.readonly }} aria-live="polite">{kcal}</output>
          </div>
        </div>
        <p style={S.hint}>Las calorías se calculan solas a partir de los macros.</p>

        {error && <p style={S.error}>{error}</p>}

        <div style={S.actions}>
          <button style={S.primary} onClick={submit} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar alimento'}
          </button>
          <button style={S.ghost} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

const Macro = ({ label, color, value, onChange }) => (
  <div>
    <span style={S.macroLabel}>{label}</span>
    <input
      style={{ ...S.input, borderColor: color, color, textAlign: 'center', fontWeight: 700 }}
      type="number" min="0" step="0.1" value={value} onChange={onChange}
    />
  </div>
)

const S = {
  overlay: { position: 'fixed', inset: 0, background: '#000C', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520 },
  h3: { color: 'var(--red)', margin: 0 },
  muted: { color: 'var(--muted)', fontSize: 13, marginTop: 4 },
  hint: { color: 'var(--muted)', fontSize: 12, marginTop: 8 },
  error: { color: 'var(--red-hi)', fontSize: 13 },
  label: { display: 'block', marginTop: 14, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  macroLabel: { display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, textAlign: 'center' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px,1fr))', gap: 10 },
  input: {
    display: 'block', width: '100%', marginTop: 6, background: '#111',
    border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
    color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
  },
  readonly: { background: '#0C0C0C', color: 'var(--red)', textAlign: 'center', fontWeight: 700, cursor: 'default' },
  actions: { display: 'flex', gap: 8, marginTop: 20 },
  primary: { background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, flex: 1 },
  ghost: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' },
}
