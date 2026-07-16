import { useState } from 'react'
import { useSession } from './lib/useSession'
import { signOut } from './api/auth'
import AuthPage from './pages/AuthPage'
import ClientsPage from './pages/ClientsPage'
import RoutinesPage from './pages/RoutinesPage'
import DietsPage from './pages/DietsPage'
import RecipesPage from './pages/RecipesPage'
import PatientView from './pages/PatientView'
import CalendarPage from './pages/CalendarPage'
import LibraryPage from './pages/LibraryPage'

const TABS = [
  { id: 'clientes', label: 'Clientes' },
  { id: 'rutinas', label: 'Rutinas' },
  { id: 'dietas', label: 'Dietas' },
  { id: 'recetas', label: 'Recetas' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'libreria', label: 'Librería' },
]

export default function App() {
  const { profile, loading, isCoach } = useSession()
  const [tab, setTab] = useState('clientes')

  if (loading) return <Splash>Cargando…</Splash>
  if (!profile) return <AuthPage />

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <header style={topBar}>
        <div>
          <h1 style={{ color: 'var(--red)', margin: 0 }}>Kaizen Coach</h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>
            {profile.name} · {isCoach ? 'Coach' : 'Paciente'}
          </p>
        </div>
        <button style={logoutBtn} onClick={() => signOut()}>Salir</button>
      </header>

      {isCoach ? (
        <>
          <nav style={nav}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ ...navBtn, ...(tab === t.id ? navActive : null) }}>
                {t.label}
              </button>
            ))}
          </nav>

          {tab === 'clientes' && <ClientsPage coachId={profile.id} />}
          {tab === 'rutinas' && <RoutinesPage coachId={profile.id} />}
          {tab === 'dietas' && <DietsPage coachId={profile.id} />}
          {tab === 'recetas' && <RecipesPage coachId={profile.id} coachName={profile.name} />}
          {tab === 'calendario' && <CalendarPage coachId={profile.id} />}
          {tab === 'libreria' && <LibraryPage coachId={profile.id} />}
        </>
      ) : (
        <PatientView profile={profile} />
      )}
    </main>
  )
}

const topBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }
const logoutBtn = { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }
const nav = { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20, flexWrap: 'wrap' }
const navBtn = { background: 'transparent', border: 0, borderBottom: '2px solid transparent', color: 'var(--muted)', padding: '10px 16px', cursor: 'pointer', fontSize: 14 }
const navActive = { color: 'var(--red)', borderBottomColor: 'var(--red)', fontWeight: 600 }

const Splash = ({ children }) => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', color: 'var(--muted)' }}>
    {children}
  </div>
)
