import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMyClient, saveSteps, updateClient } from '../api/clients'
import { kcalFromMacros } from '../api/mappers'

const TABS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'rutina', label: 'Mi rutina' },
  { id: 'dieta', label: 'Mi dieta' },
  { id: 'progreso', label: 'Progreso' },
]
const today = () => new Date().toISOString().slice(0, 10)

export default function PatientView({ profile }) {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('inicio')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const c = await getMyClient(profile.id)
      setClient(c)
      setError(c ? '' : 'Tu coach aún no ha activado tu ficha.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [profile.id])

  useEffect(() => { load() }, [load])

  if (loading) return <p style={S.muted}>Cargando…</p>

  // Normalizamos para que ninguna sección truene por un campo vacío.
  const c = {
    name: profile.name, avatar: null, startDate: null, routine: null, diet: null,
    measures: [], stepsHistory: [], calendarTasks: {},
    ...(client ?? {}),
  }

  const uploadPhoto = async (file) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const updated = await updateClient(c.id, { avatar: e.target.result })
      setClient(updated)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <Header client={c} onPhoto={uploadPhoto} />

      <nav style={S.nav}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...S.navBtn, ...(tab === t.id ? S.navActive : null) }}>
            {t.label}
          </button>
        ))}
      </nav>

      {error && <p style={S.warn}>{error}</p>}

      {tab === 'inicio' && <><TodayTasks tasks={c.calendarTasks} /><StepsCard client={c} onSaved={setClient} /></>}
      {tab === 'rutina' && <RoutineView routine={c.routine} />}
      {tab === 'dieta' && <DietView diet={c.diet} />}
      {tab === 'progreso' && <ProgressView measures={c.measures} steps={c.stepsHistory} />}
    </div>
  )
}

function Header({ client, onPhoto }) {
  return (
    <div style={S.header}>
      <label style={S.avatarWrap} title="Cambiar foto">
        <div style={{
          ...S.avatar,
          backgroundImage: client.avatar ? `url(${client.avatar})` : undefined,
        }}>
          {!client.avatar && '👤'}
        </div>
        <input type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && onPhoto(e.target.files[0])} />
      </label>
      <div>
        <h2 style={S.hello}>HOLA, {client.name.split(' ')[0].toUpperCase()} 👋</h2>
        {client.startDate && <p style={S.muted}>Inicio: {client.startDate}</p>}
      </div>
    </div>
  )
}

function StepsCard({ client, onSaved }) {
  const [date, setDate] = useState(today())
  const [value, setValue] = useState('')
  const [status, setStatus] = useState('idle')

  const current = useMemo(
    () => (client.stepsHistory ?? []).find((s) => s.date === date)?.steps ?? 0,
    [client.stepsHistory, date]
  )
  const goal = 10000

  const save = async () => {
    const steps = Number(value)
    if (!steps) return
    setStatus('saving')
    try {
      const updated = await saveSteps(client.id, date, steps)
      onSaved(updated); setValue(''); setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch (e) {
      setStatus('error')
    }
  }

  return (
    <section style={S.card}>
      <div style={S.cardHead}>
        <strong style={{ color: 'var(--red)' }}>🦶 Pasos</strong>
        <span style={S.muted}>{date}</span>
      </div>

      <div style={S.stepsBig}>{current.toLocaleString()}</div>
      <div style={S.bar}><div style={{ ...S.barFill, width: `${Math.min(100, (current / goal) * 100)}%` }} /></div>
      <p style={{ ...S.muted, textAlign: 'center' }}>pasos · Meta: {goal.toLocaleString()}</p>

      {/* Selector de fecha: permite registrar días anteriores. */}
      <label style={S.label}>Fecha
        <input style={S.input} type="date" max={today()} value={date}
          onChange={(e) => setDate(e.target.value)} />
      </label>

      <div style={S.row}>
        <input style={{ ...S.input, marginTop: 0 }} type="number" min="0" value={value}
          onChange={(e) => setValue(e.target.value)} placeholder="Ingresar pasos" />
        <button style={S.primary} onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? '…' : status === 'saved' ? '✓' : 'Guardar'}
        </button>
      </div>
      {status === 'error' && <p style={S.warn}>No se pudo guardar. Revisa tu conexión.</p>}
    </section>
  )
}

function RoutineView({ routine }) {
  if (!routine || !routine.days?.length) return <Empty>Tu coach aún no te asignó una rutina.</Empty>
  return (
    <section>
      {routine.days.map((day, i) => (
        <div key={i} style={S.card}>
          <strong style={{ color: 'var(--red)' }}>{day.name}</strong>
          {day.exercises.map((ex, j) => (
            <div key={j} style={S.exercise}>
              <strong>{ex.name}</strong>
              <div style={S.muted}>
                {ex.sets} series · {ex.reps} reps · RIR {ex.rir} · descanso {ex.rest}
              </div>
              {ex.note && <p style={S.note}>{ex.note}</p>}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

function DietView({ diet }) {
  if (!diet || !diet.meals?.length) return <Empty>Tu coach aún no te asignó un plan.</Empty>
  return (
    <section>
      {diet.macros && (
        <div style={S.card}>
          <strong style={{ color: 'var(--red)' }}>Objetivo diario</strong>
          <div style={S.muted}>
            {kcalFromMacros(diet.macros)} kcal · P:{diet.macros.protein}g · C:{diet.macros.carbs}g · G:{diet.macros.fat}g
          </div>
        </div>
      )}
      {diet.meals.map((m, i) => (
        <div key={i} style={S.card}>
          <strong>{m.time}</strong>
          <div style={S.muted}>{m.items.map((it) => it.name).join(' · ')}</div>
          {m.comment && <p style={S.note}>{m.comment}</p>}
        </div>
      ))}
    </section>
  )
}

function ProgressView({ measures, steps }) {
  const hasData = (measures?.length ?? 0) > 0 || (steps?.length ?? 0) > 0
  if (!hasData) return <Empty>Aún no hay registros de progreso.</Empty>

  return (
    <section>
      {measures?.length > 0 && (
        <div style={S.card}>
          <strong style={{ color: 'var(--red)' }}>📏 Medidas</strong>
          <p style={S.muted}>Las registra tu coach una vez al mes.</p>
          {measures.map((m, i) => (
            <div key={i} style={S.measureRow}>
              <span>{m.date}</span>
              <span style={S.muted}>{m.peso ? `${m.peso} kg` : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {steps?.length > 0 && (
        <div style={S.card}>
          <strong style={{ color: 'var(--red)' }}>🦶 Pasos recientes</strong>
          {steps.slice(-7).reverse().map((s, i) => (
            <div key={i} style={S.measureRow}>
              <span>{s.date}</span>
              <span style={S.muted}>{s.steps.toLocaleString()} pasos</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function TodayTasks({ tasks }) {
  const t = new Date().toISOString().slice(0, 10)
  const list = (tasks ?? {})[t] ?? []
  if (list.length === 0) return null
  return (
    <section style={S.card}>
      <strong style={{ color: 'var(--red)' }}>📋 Tus tareas de hoy</strong>
      {list.map((task) => (
        <div key={task.id} style={S.exercise}>
          <strong>{task.title}</strong>
          {task.url && <a style={{ color: 'var(--red)', fontSize: 12, marginLeft: 8, textDecoration: 'underline' }}
            href={task.url} target="_blank" rel="noreferrer">🔗 Abrir enlace</a>}
          {task.notes && <p style={S.note}>{task.notes}</p>}
        </div>
      ))}
    </section>
  )
}

const Empty = ({ children }) => <p style={{ ...S.muted, padding: 24, textAlign: 'center' }}>{children}</p>

const S = {
  header: { display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,#8B0000,#D0171D)', borderRadius: 16, padding: 18, marginBottom: 16 },
  avatarWrap: { cursor: 'pointer', flexShrink: 0 },
  avatar: { width: 56, height: 56, borderRadius: '50%', backgroundColor: '#fff2', backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid #fff5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' },
  hello: { margin: 0, fontSize: 24 },
  muted: { color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' },
  warn: { color: 'var(--gold)', fontSize: 13 },
  nav: { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16, flexWrap: 'wrap' },
  navBtn: { background: 'transparent', border: 0, borderBottom: '2px solid transparent', color: 'var(--muted)', padding: '10px 14px', cursor: 'pointer', fontSize: 14 },
  navActive: { color: 'var(--red)', borderBottomColor: 'var(--red)', fontWeight: 600 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  stepsBig: { fontSize: 40, fontFamily: 'var(--font-display)', textAlign: 'center', margin: '12px 0 4px' },
  bar: { height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', background: 'var(--red)', borderRadius: 3 },
  row: { display: 'flex', gap: 8, marginTop: 10 },
  label: { display: 'block', marginTop: 14, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' },
  input: { display: 'block', width: '100%', marginTop: 6, background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' },
  primary: { background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 },
  exercise: { background: '#0F0F0F', borderRadius: 8, padding: 12, marginTop: 10 },
  note: { color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  measureRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 14 },
}
