import { useState } from 'react'
import { signIn, signUp, requestPasswordReset } from '../api/auth'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | register | forgot
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'login') {
        await signIn({ email: form.email.trim(), password: form.password })
        // useSession detecta el cambio de sesión y App re-renderiza.
      } else if (mode === 'register') {
        if (!form.name.trim()) throw new Error('Escribe tu nombre.')
        if (form.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
        if (form.password !== form.confirm) throw new Error('Las contraseñas no coinciden.')
        await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password })
        setInfo('Cuenta creada. Ya puedes iniciar sesión.')
        setMode('login')
      } else {
        await requestPasswordReset(form.email.trim())
        setInfo('Te enviamos un correo para restablecer tu contraseña.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e) => { if (e.key === 'Enter') submit() }

  return (
    <div style={S.screen}>
      <div style={S.card}>
        <div style={S.logo}>KAIZEN</div>

        <h1 style={S.title}>
          {mode === 'login' ? 'Inicia sesión' : mode === 'register' ? 'Crea tu cuenta' : 'Recuperar acceso'}
        </h1>

        {mode === 'register' && (
          <Field label="Nombre completo">
            <input style={S.input} value={form.name} onChange={set('name')} onKeyDown={onKey} autoFocus />
          </Field>
        )}

        <Field label="Correo">
          <input style={S.input} type="email" value={form.email} onChange={set('email')} onKeyDown={onKey}
            autoFocus={mode !== 'register'} />
        </Field>

        {mode !== 'forgot' && (
          <Field label="Contraseña">
            <input style={S.input} type="password" value={form.password} onChange={set('password')} onKeyDown={onKey} />
          </Field>
        )}

        {mode === 'register' && (
          <Field label="Confirmar contraseña">
            <input style={S.input} type="password" value={form.confirm} onChange={set('confirm')} onKeyDown={onKey} />
          </Field>
        )}

        {error && <p style={S.error}>{error}</p>}
        {info && <p style={S.info}>{info}</p>}

        <button style={S.primary} onClick={submit} disabled={busy}>
          {busy ? 'Un momento…'
            : mode === 'login' ? 'Entrar'
            : mode === 'register' ? 'Crear cuenta'
            : 'Enviar correo'}
        </button>

        <div style={S.links}>
          {mode === 'login' && (
            <>
              <button style={S.link} onClick={() => setMode('forgot')}>Olvidé mi contraseña</button>
              <button style={S.link} onClick={() => setMode('register')}>Crear una cuenta</button>
            </>
          )}
          {mode !== 'login' && (
            <button style={S.link} onClick={() => setMode('login')}>← Volver a iniciar sesión</button>
          )}
        </div>
      </div>
    </div>
  )
}

const Field = ({ label, children }) => (
  <label style={S.label}>{label}{children}</label>
)

const S = {
  screen: { display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 16 },
  card: { width: '100%', maxWidth: 380 },
  logo: {
    fontFamily: 'var(--font-display)', color: 'var(--red)', fontSize: 28, letterSpacing: '.2em',
    border: '2px solid var(--red)', width: 'fit-content', padding: '4px 10px', margin: '0 auto 28px',
  },
  title: { textAlign: 'center', marginBottom: 20 },
  label: { display: 'block', marginTop: 14, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  input: {
    display: 'block', width: '100%', marginTop: 6, background: '#111',
    border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px',
    color: 'var(--text)', fontSize: 15, boxSizing: 'border-box',
  },
  primary: {
    width: '100%', marginTop: 22, background: 'var(--red)', color: '#fff', border: 0,
    borderRadius: 10, padding: '13px', cursor: 'pointer', fontWeight: 600, fontSize: 15,
  },
  links: { display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 12, flexWrap: 'wrap' },
  link: { background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 13 },
  error: { color: 'var(--red-hi)', fontSize: 13, marginTop: 14 },
  info: { color: 'var(--green)', fontSize: 13, marginTop: 14 },
}
