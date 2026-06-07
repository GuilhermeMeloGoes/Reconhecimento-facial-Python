import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { usuario, loading } = useAuth()

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.loadingInner}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <span style={s.loadingText}>Verificando autenticação…</span>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && usuario.perfil !== requiredRole) {
    // Redirect based on role
    if (usuario.perfil === 'admin') {
      return <Navigate to="/" replace />
    }
    return <Navigate to="/portal" replace />
  }

  return children
}

const s = {
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-base)',
  },
  loadingInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
}
