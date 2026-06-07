import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)
  const [showSenha, setShowSenha] = useState(false)

  const { login } = useAuth()
  const navigate   = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !senha.trim()) {
      setErro('Preencha email e senha')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const usuario = await login(email.trim(), senha)
      if (usuario.perfil === 'admin') {
        navigate('/', { replace: true })
      } else {
        navigate('/portal', { replace: true })
      }
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Animated background */}
      <div style={s.bgOrb1} />
      <div style={s.bgOrb2} />
      <div style={s.bgOrb3} />

      <div style={s.container} className="scale-in">
        {/* Logo */}
        <div style={s.logoArea}>
          <div style={s.logoIcon}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="loginLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6C5CE7" />
                  <stop offset="100%" stopColor="#00D2FF" />
                </linearGradient>
              </defs>
              <path d="M7 3H5a2 2 0 0 0-2 2v2" stroke="url(#loginLogo)" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" stroke="url(#loginLogo)" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" stroke="url(#loginLogo)" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 21h2a2 2 0 0 0 2-2v-2" stroke="url(#loginLogo)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="10" r="3" stroke="url(#loginLogo)" strokeWidth="2" />
              <path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="url(#loginLogo)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={s.logoName}>FacePresença</h1>
          <p style={s.logoSub}>Sistema de reconhecimento facial</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          {erro && (
            <div style={s.erroBanner} className="fade-in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {erro}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <div style={s.inputWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={s.inputIcon}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="login-email"
                className="form-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                style={s.inputWithIcon}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-senha">Senha</label>
            <div style={s.inputWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={s.inputIcon}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="login-senha"
                className="form-input"
                type={showSenha ? 'text' : 'password'}
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                autoComplete="current-password"
                style={s.inputWithIcon}
              />
              <button
                type="button"
                onClick={() => setShowSenha(v => !v)}
                style={s.eyeBtn}
                tabIndex={-1}
                aria-label={showSenha ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showSenha ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={s.submitBtn}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Entrando…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Entrar
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={s.footer}>
          <span style={s.footerText}>FacePresença v3.0</span>
        </div>
      </div>

      <style>{loginCSS}</style>
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  page: {
    minHeight: '100vh',
    minWidth: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  bgOrb1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)',
    top: '-15%',
    left: '-10%',
    animation: 'float 8s ease-in-out infinite',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,210,255,0.12) 0%, transparent 70%)',
    bottom: '-10%',
    right: '-5%',
    animation: 'float 10s ease-in-out infinite reverse',
    pointerEvents: 'none',
  },
  bgOrb3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%)',
    top: '50%',
    right: '20%',
    animation: 'float 12s ease-in-out infinite 2s',
    pointerEvents: 'none',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 36px 32px',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 120px rgba(108,92,231,0.08)',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    background: 'rgba(108,92,231,0.1)',
    border: '1px solid rgba(108,92,231,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  logoName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em',
    margin: '0 0 4px',
  },
  logoSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    margin: 0,
    fontFamily: 'var(--font-mono)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
    pointerEvents: 'none',
  },
  inputWithIcon: {
    paddingLeft: 42,
  },
  eyeBtn: {
    position: 'absolute',
    right: 4,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  erroBanner: {
    marginBottom: 16,
    padding: '12px 16px',
    background: 'var(--danger-bg)',
    border: '1px solid rgba(255,77,109,0.20)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)',
    fontSize: '0.8125rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'var(--font-sans)',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '0.9375rem',
    marginTop: 8,
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTop: '1px solid var(--border)',
  },
  footerText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.625rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
  },
}

const loginCSS = `
  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-30px) scale(1.05); }
  }
`
