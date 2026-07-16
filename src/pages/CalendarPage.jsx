import { useCallback, useEffect, useMemo, useState } from 'react'
import { listClients, updateClient } from '../api/clients'
import { questionnaires as qApi } from '../api/library'

const TASK_TYPES = [
  { id: 'workout', label: 'Workout', color: '#E8B04B', hasUrl: true },
  { id: 'cardio', label: 'Cardio', color: '#FF4D4D', hasUrl: true },
  { id: 'video', label: 'Vídeo', color: '#C77DFF', hasUrl: true },
  { id: 'nutricion', label: 'Nutrición', color: '#34C759', hasUrl: false },
  { id: 'cuestionario', label: 'Cuestionario', color: '#4A9EFF', hasUrl: false },
]
const typeOf = (id) => TASK_TYPES.find((t) => t.id === id) ?? TASK_TYPES[0]

const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d) }
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarPage({ coachId }) {
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    listClients(coachId).then((cs) => {
      setClients(cs)
      setSelected((s) => s ?? cs[0]?.id ?? null)
    }).catch(() => {})
  }, [coachId])

  const client = clients.find((c) => c.id === selected)

  return (
    <section>
      <header style={S.header}>
        <h2 style={S.h2}>Calendario</h2>
        {clients.length > 0 && (
          <select style={S.select} value={selected ?? ''} onChange={(e) => setSelected(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </header>

      {!client ? (
        <p style={S.muted}>Invita a un paciente para asignarle tareas.</p>
      ) : (
        <ClientCalendar key={client.id} coachId={coachId} client={client}
          onChange={(updated) => setClients((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))} />
      )}
    </section>
  )
}

function ClientCalendar({ client, onChange }) {
  const [tasks, setTasks] = useState(client.calendarTasks ?? {})
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [openDay, setOpenDay] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const persist = async (next) => {
    setTasks(next); setSaving(true); setError('')
    try {
      const updated = await updateClient(client.id, { calendarTasks: next })
      onChange(updated)
    } catch (e) {
      setTasks(client.calendarTasks ?? {})   // reversa
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const addTask = (date, task, repeatWeeks) => {
    const next = { ...tasks }
    const group = crypto.randomUUID?.() ?? String(Date.now())
    const occurrences = repeatWeeks > 0 ? repeatWeeks : 0
    for (let i = 0; i <= occurrences; i++) {
      const d = addDays(date, i * 7)
      const entry = { id: `${group}-${i}`, group, ...task }
      next[d] = [...(next[d] ?? []), entry]
    }
    persist(next)
  }

  const removeTask = (date, taskId) => {
    const next = { ...tasks, [date]: (tasks[date] ?? []).filter((t) => t.id !== taskId) }
    if (next[date].length === 0) delete next[date]
    persist(next)
  }

  const grid = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor])

  return (
    <div>
      <div style={S.monthNav}>
        <button style={S.ghost} onClick={() => setCursor(shift(cursor, -1))}>‹</button>
        <strong>{MONTHS[cursor.m]} {cursor.y}</strong>
        <button style={S.ghost} onClick={() => setCursor(shift(cursor, 1))}>›</button>
      </div>

      {saving && <p style={S.muted}>Guardando…</p>}
      {error && <p style={S.warn}>⚠️ {error}</p>}

      <div style={S.dowRow}>{DOW.map((d) => <span key={d} style={S.dow}>{d}</span>)}</div>
      <div style={S.grid}>
        {grid.map((cell, i) => (
          <button key={i} style={{ ...S.cell, ...(cell ? null : S.cellEmpty) }}
            disabled={!cell} onClick={() => cell && setOpenDay(cell)}>
            {cell && <>
              <span style={S.dayNum}>{Number(cell.slice(-2))}</span>
              <span style={S.dots}>
                {(tasks[cell] ?? []).slice(0, 4).map((t) => (
                  <i key={t.id} style={{ ...S.dot, background: typeOf(t.type).color }} />
                ))}
              </span>
            </>}
          </button>
        ))}
      </div>

      {openDay && (
        <DayModal
          date={openDay}
          tasks={tasks[openDay] ?? []}
          coachId={client.coachId}
          onAdd={(task, repeat) => addTask(openDay, task, repeat)}
          onRemove={(id) => removeTask(openDay, id)}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  )
}

function DayModal({ date, tasks, coachId, onAdd, onRemove, onClose }) {
  const [type, setType] = useState('workout')
  const [form, setForm] = useState({ title: '', notes: '', url: '' })
  const [repeat, setRepeat] = useState(0)
  const [quests, setQuests] = useState([])

  useEffect(() => { qApi.list(coachId).then(setQuests).catch(() => {}) }, [coachId])

  const t = typeOf(type)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    if (type === 'cuestionario') {
      if (!form.title) return
      onAdd({ type, title: form.title, questionnaireId: form.url }, repeat)
    } else {
      if (!form.title.trim()) return
      onAdd({ type, title: form.title, notes: form.notes, url: t.hasUrl ? form.url : '' }, repeat)
    }
    setForm({ title: '', notes: '', url: '' }); setRepeat(0)
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <h3 style={S.h2}>Tareas · {date}</h3>
          <button style={S.linkDanger} onClick={onClose}>×</button>
        </div>

        {tasks.length > 0 && (
          <ul style={S.taskList}>
            {tasks.map((task) => (
              <li key={task.id} style={S.taskItem}>
                <i style={{ ...S.dot, background: typeOf(task.type).color }} />
                <div style={{ flex: 1 }}>
                  <strong>{task.title}</strong>
                  {task.url && <a style={S.taskLink} href={task.url} target="_blank" rel="noreferrer">🔗 Abrir</a>}
                  {task.notes && <div style={S.muted}>{task.notes}</div>}
                </div>
                <button style={S.linkDanger} onClick={() => onRemove(task.id)}>Quitar</button>
              </li>
            ))}
          </ul>
        )}

        <div style={S.divider} />

        <label style={S.label}>Tipo de tarea
          <div style={S.typeRow}>
            {TASK_TYPES.map((tt) => (
              <button key={tt.id} onClick={() => setType(tt.id)}
                style={{ ...S.typeChip, ...(type === tt.id ? { borderColor: tt.color, color: tt.color } : null) }}>
                {tt.label}
              </button>
            ))}
          </div>
        </label>

        {type === 'cuestionario' ? (
          <label style={S.label}>Cuestionario
            <select style={S.input} value={form.url}
              onChange={(e) => setForm({ title: quests.find((q) => q.id === e.target.value)?.title ?? '', notes: '', url: e.target.value })}>
              <option value="">— Elige —</option>
              {quests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label style={S.label}>Título
              <input style={S.input} value={form.title} onChange={set('title')} placeholder={`Ej: ${t.label} del día`} />
            </label>
            {t.hasUrl && (
              <label style={S.label}>🔗 Enlace / URL
                <input style={S.input} value={form.url} onChange={set('url')} placeholder="https://youtube.com/…" />
              </label>
            )}
            <label style={S.label}>Notas
              <textarea style={{ ...S.input, minHeight: 56 }} value={form.notes} onChange={set('notes')} placeholder="Instrucciones…" />
            </label>
          </>
        )}

        {/* Repetir: pedido del PDF. */}
        <label style={S.label}>¿Repetir?
          <select style={S.input} value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
            <option value={0}>No, solo este día</option>
            <option value={3}>Cada semana · 1 mes</option>
            <option value={7}>Cada semana · 2 meses</option>
            <option value={11}>Cada semana · 3 meses</option>
          </select>
        </label>

        <button style={{ ...S.primary, width: '100%', marginTop: 14 }} onClick={submit}>
          + Agregar {t.label}
        </button>
      </div>
    </div>
  )
}

// ---- helpers de calendario ----
function buildMonth(y, m) {
  const first = new Date(y, m, 1)
  const startDow = (first.getDay() + 6) % 7 // lunes = 0
  const days = new Date(y, m + 1, 0).getDate()
  const cells = Array(startDow).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  return cells
}
const shift = ({ y, m }, dir) => {
  let nm = m + dir, ny = y
  if (nm < 0) { nm = 11; ny-- } if (nm > 11) { nm = 0; ny++ }
  return { y: ny, m: nm }
}

const S = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  h2: { color: 'var(--red)', margin: 0 },
  muted: { color: 'var(--muted)', fontSize: 13 },
  warn: { color: 'var(--red-hi)', fontSize: 13 },
  select: { background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 14 },
  monthNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dowRow: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 },
  dow: { textAlign: 'center', color: 'var(--muted)', fontSize: 11 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 },
  cell: { aspectRatio: '1', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 4, color: 'var(--text)' },
  cellEmpty: { background: 'transparent', border: 0, cursor: 'default' },
  dayNum: { fontSize: 13, alignSelf: 'flex-end', color: 'var(--muted)' },
  dots: { display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 'auto', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: '50%', display: 'inline-block' },
  overlay: { position: 'fixed', inset: 0, background: '#000C', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 460, maxHeight: '90dvh', overflowY: 'auto' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  taskList: { listStyle: 'none', padding: 0, margin: '10px 0', display: 'grid', gap: 8 },
  taskItem: { display: 'flex', gap: 10, alignItems: 'flex-start', background: '#111', borderRadius: 8, padding: 10 },
  taskLink: { color: 'var(--red)', fontSize: 12, marginLeft: 8, textDecoration: 'underline' },
  divider: { height: 1, background: 'var(--border)', margin: '14px 0' },
  label: { display: 'block', marginTop: 12, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  input: { display: 'block', width: '100%', marginTop: 6, background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' },
  typeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  typeChip: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 },
  primary: { background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8, padding: '11px 16px', cursor: 'pointer', fontWeight: 600 },
  ghost: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' },
  linkDanger: { background: 'transparent', color: 'var(--muted)', border: 0, cursor: 'pointer', fontSize: 14 },
}
