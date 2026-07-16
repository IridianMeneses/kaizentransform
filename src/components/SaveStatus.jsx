/**
 * Indicador de guardado. Va en todas las pantallas que escriben.
 * Si algo falla, se ve aquí — nunca sólo en la consola.
 */
export default function SaveStatus({ status, error, onRetry }) {
  if (status === 'error') {
    return (
      <div role="alert" style={{ ...S.base, ...S.error }}>
        <span>⚠️ {error ?? 'No se pudo guardar.'}</span>
        {onRetry && <button style={S.retry} onClick={onRetry}>Reintentar</button>}
      </div>
    )
  }

  if (status === 'saving') return <div style={{ ...S.base, ...S.muted }} aria-live="polite">Guardando…</div>
  if (status === 'saved')  return <div style={{ ...S.base, ...S.ok }} aria-live="polite">Guardado ✓</div>
  if (status === 'loading') return <div style={{ ...S.base, ...S.muted }}>Cargando…</div>

  return null
}

const S = {
  base: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 12,
  },
  muted: { color: 'var(--muted)' },
  ok:    { color: 'var(--green)' },
  error: { color: 'var(--red-hi)', background: '#D0171D18', border: '1px solid var(--red)' },
  retry: {
    marginLeft: 'auto', background: 'transparent', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
    cursor: 'pointer', fontSize: 12,
  },
}
