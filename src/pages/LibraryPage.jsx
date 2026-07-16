import { useCallback, useEffect, useRef, useState } from 'react'
import { documents } from '../api/library'
import { listClients } from '../api/clients'
import { readable } from '../lib/useResource'

const CATEGORIES = ['Recursos', 'Guías', 'Planes', 'Videos', 'Otros']

export default function LibraryPage({ coachId }) {
  const [docs, setDocs] = useState([])
  const [clients, setClients] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const refresh = useCallback(async () => {
    setStatus('loading'); setError('')
    try {
      const [d, cs] = await Promise.all([documents.list(coachId), listClients(coachId)])
      setDocs(d); setClients(cs); setStatus('idle')
    } catch (e) {
      setError(readable(e)); setStatus('error')
    }
  }, [coachId])

  useEffect(() => { refresh() }, [refresh])

  const open = async (doc) => {
    try {
      const url = await documents.signedUrl(doc.storagePath)
      window.open(url, '_blank')
    } catch (e) {
      setError(readable(e))
    }
  }

  const remove = async (doc) => {
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return
    setDocs((d) => d.filter((x) => x.id !== doc.id))     // optimista
    try {
      await documents.remove(doc)
    } catch (e) {
      setError(readable(e)); refresh()
    }
  }

  return (
    <section>
      <header style={S.header}>
        <div>
          <h2 style={S.h2}>Librería</h2>
          <span style={S.muted}>{docs.length} documento{docs.length !== 1 && 's'}</span>
        </div>
        <button style={S.primary} onClick={() => setEditing({})}>+ Subir documento</button>
      </header>

      {error && <p style={S.error}>⚠️ {error}</p>}
      {status === 'loading' && <p style={S.muted}>Cargando…</p>}

      {status === 'idle' && docs.length === 0 ? (
        <div style={S.empty}>
          <p>Aún no tienes documentos.</p>
          <button style={S.primary} onClick={() => setEditing({})}>Subir el primero</button>
        </div>
      ) : (
        <ul style={S.list}>
          {docs.map((doc) => (
            <li key={doc.id} style={S.row}>
              <button style={S.docMain} onClick={() => open(doc)}>
                <span style={S.fileIcon}>📄</span>
                <span style={S.docText}>
                  <strong>{doc.title}</strong>
                  <span style={S.meta}>
                    {doc.category} · {doc.createdAt?.slice(0, 10)}
                    {doc.fileSize ? ` · ${fmtSize(doc.fileSize)}` : ''}
                  </span>
                  {doc.description && <span style={S.desc}>{doc.description}</span>}
                </span>
              </button>

              {/* Menú editar / eliminar — pedido del PDF */}
              <Menu
                onEdit={() => setEditing(doc)}
                onDelete={() => remove(doc)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <UploadModal
          coachId={coachId}
          clients={clients}
          doc={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); refresh() }}
        />
      )}
    </section>
  )
}

function Menu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button style={S.menuBtn} onClick={() => setOpen((o) => !o)} aria-label="Opciones">⋯</button>
      {open && (
        <div style={S.menu}>
          <button style={S.menuItem} onClick={() => { setOpen(false); onEdit() }}>Editar</button>
          <button style={{ ...S.menuItem, color: 'var(--red-hi)' }} onClick={() => { setOpen(false); onDelete() }}>Eliminar</button>
        </div>
      )}
    </div>
  )
}

function UploadModal({ coachId, clients, doc, onClose, onDone }) {
  const [form, setForm] = useState(doc ?? { title: '', category: 'Recursos', description: '', clientId: '' })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.title.trim()) return setError('Ponle título.')
    if (!doc && !file) return setError('Elige un archivo de tu computadora.')
    setBusy(true); setError('')
    try {
      if (doc) {
        await documents.update(doc.id, form)         // editar metadatos
      } else {
        await documents.upload(file, form, coachId)  // subir archivo real
      }
      onDone()
    } catch (e) {
      setError(readable(e)); setBusy(false)
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={S.h2}>{doc ? 'Editar documento' : 'Subir documento'}</h3>

        <label style={S.label}>Título
          <input style={S.input} value={form.title} onChange={set('title')} autoFocus />
        </label>

        <div style={S.grid2}>
          <label style={S.label}>Categoría
            <select style={S.input} value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label style={S.label}>Asignar a paciente <span style={S.muted}>(opcional)</span>
            <select style={S.input} value={form.clientId ?? ''} onChange={set('clientId')}>
              <option value="">— Sin asignar —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>

        <label style={S.label}>Descripción
          <input style={S.input} value={form.description} onChange={set('description')} />
        </label>

        {/* Archivo de la computadora, no una liga de Drive — pedido del PDF */}
        {!doc && (
          <label style={S.label}>Archivo
            <input style={{ ...S.input, padding: 8 }} type="file"
              onChange={(e) => setFile(e.target.files[0] ?? null)} />
            {file && <span style={S.muted}>{file.name} · {fmtSize(file.size)}</span>}
          </label>
        )}
        {doc && <p style={S.muted}>El archivo no se cambia al editar; solo los datos.</p>}

        {error && <p style={S.error}>{error}</p>}

        <div style={S.actions}>
          <button style={S.primary} onClick={submit} disabled={busy}>
            {busy ? 'Subiendo…' : doc ? 'Guardar' : 'Subir'}
          </button>
          <button style={S.ghost} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const S = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h2: { color: 'var(--red)', margin: 0 },
  muted: { color: 'var(--muted)', fontSize: 13 },
  error: { color: 'var(--red-hi)', fontSize: 13 },
  empty: { textAlign: 'center', padding: 40, color: 'var(--muted)' },
  list: { listStyle: 'none', padding: 0, display: 'grid', gap: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 6 },
  docMain: { flex: 1, display: 'flex', gap: 12, alignItems: 'center', background: 'transparent', border: 0, color: 'var(--text)', cursor: 'pointer', textAlign: 'left', padding: 10 },
  fileIcon: { fontSize: 22, flexShrink: 0 },
  docText: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  meta: { color: 'var(--muted)', fontSize: 12 },
  desc: { color: 'var(--muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  menuBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', width: 34, height: 34, cursor: 'pointer', fontSize: 18 },
  menu: { position: 'absolute', right: 0, top: '110%', background: '#1A1A1A', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', zIndex: 10, minWidth: 120 },
  menuItem: { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: 'var(--text)', padding: '10px 14px', cursor: 'pointer', fontSize: 13 },
  overlay: { position: 'fixed', inset: 0, background: '#000C', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12 },
  label: { display: 'block', marginTop: 14, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  input: { display: 'block', width: '100%', marginTop: 6, background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' },
  actions: { display: 'flex', gap: 8, marginTop: 20 },
  primary: { background: 'var(--red)', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600 },
  ghost: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer' },
}
