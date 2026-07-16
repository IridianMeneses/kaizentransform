import { useCallback, useState } from 'react'
import { listClients, updateClient, invitationLink } from '../api/clients'
import { useResource } from '../lib/useResource'
import SaveStatus from '../components/SaveStatus'

const APP_URL = 'https://iridianmeneses.github.io/kaizentransform/'

export default function ClientsPage({ coachId }) {
  const [showInvite, setShowInvite] = useState(false)

  // Todo el guardado pasa por el motor: optimista, con reversa y estado visible.
  const load = useCallback(() => listClients(coachId), [coachId])
  const save = useCallback((c) => updateClient(c.id, c), [])
  const { items: clients, status, error, refresh, commit, isLoading } = useResource({
    load, save, enabled: !!coachId,
  })

  const setStatusOf = (client, newStatus) =>
    commit({ ...client, status: newStatus }).catch(() => {}) // el motor ya revirtió y avisó

  return (
    <section>
      <header style={S.header}>
        <h2 style={S.h2}>Clientes</h2>
        <button style={S.primary} onClick={() => setShowInvite(true)}>+ Invitar paciente</button>
      </header>

      <SaveStatus status={status} error={error} onRetry={refresh} />

      {isLoading ? null : clients.length === 0 ? (
        <div style={S.empty}>
          <p>Todavía no tienes pacientes.</p>
          <p style={S.muted}>Invítalos por WhatsApp. Cuando creen su cuenta aparecerán aquí.</p>
          <button style={S.primary} onClick={() => setShowInvite(true)}>Invitar al primero</button>
        </div>
      ) : (
        <ul style={S.list}>
          {clients.map((c) => (
            <li key={c.id} style={S.card}>
              <div>
                <strong>{c.name}</strong>
                <div style={S.muted}>{c.email}</div>
                <span style={{ ...S.badge, color: c.status === 'active' ? 'var(--green)' : 'var(--muted)' }}>
                  {c.status}
                </span>
              </div>
              <div style={S.actions}>
                {c.status === 'active'
                  ? <button style={S.ghost} onClick={() => setStatusOf(c, 'baja')}>Dar de baja</button>
                  : <button style={S.ghost} onClick={() => setStatusOf(c, 'active')}>Reactivar</button>}
                <button style={S.danger} onClick={() => setStatusOf(c, 'eliminado')}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </section>
  )
}

function InviteModal({ onClose }) {
  const [form, setForm] = useState({ name: '', phone: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const ready = form.name.trim() && form.phone.trim()

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={S.h2}>Invitar paciente</h3>
        <p style={S.muted}>
          Se abre WhatsApp con la liga. Cuando cree su cuenta, su ficha aparece
          aquí ligada a ti automáticamente.
        </p>

        <label style={S.label}>Nombre
          <input style={S.input} value={form.name} onChange={set('name')} autoFocus />
        </label>
        <label style={S.label}>WhatsApp
          <input style={S.input} value={form.phone} onChange={set('phone')} placeholder="5215512345678" />
        </label>

        <div style={S.actions}>
          <a
            style={{ ...S.primary, opacity: ready ? 1 : 0.5, pointerEvents: ready ? 'auto' : 'none' }}
            href={ready ? invitationLink(form.phone, form.name, APP_URL) : undefined}
            target="_blank" rel="noreferrer" onClick={onClose}
          >
            Abrir WhatsApp
          </a>
          <button style={S.ghost} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

const S = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h2: { color: 'var(--red)', margin: 0 },
  muted: { color: 'var(--muted)', fontSize: 13 },
  empty: { textAlign: 'center', padding: 40, color: 'var(--muted)' },
  list: { listStyle: 'none', padding: 0, display: 'grid', gap: 10 },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 14,
  },
  badge: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' },
  actions: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 },
  primary: {
    background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8,
    padding: '10px 16px', cursor: 'pointer', fontWeight: 600, textDecoration: 'none',
    display: 'inline-block',
  },
  ghost: {
    background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13,
  },
  danger: {
    background: 'transparent', color: 'var(--red-hi)', border: '1px solid var(--red)',
    borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13,
  },
  overlay: { position: 'fixed', inset: 0, background: '#000A', display: 'grid', placeItems: 'center', padding: 16 },
  modal: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    padding: 24, width: '100%', maxWidth: 420,
  },
  label: { display: 'block', marginTop: 14, fontSize: 13, color: 'var(--muted)' },
  input: {
    display: 'block', width: '100%', marginTop: 6, background: '#111',
    border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
    color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
  },
}
