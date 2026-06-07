import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/reconhecimento',
    label: 'Reconhecimento',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3H5a2 2 0 0 0-2 2v2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 17c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      </svg>
    ),
  },
  {
    path: '/alunos',
    label: 'Alunos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    path: '/relatorio',
    label: 'Relatório',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    path: '/usuarios',
    label: 'Usuários',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

const CADASTRAR_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
)

const PAGE_TITLES = {
  '/':               'Dashboard',
  '/reconhecimento': 'Reconhecimento Facial',
  '/alunos':         'Alunos Cadastrados',
  '/cadastrar':      'Cadastrar Aluno',
  '/relatorio':      'Relatório de Presença',
  '/usuarios':       'Gerenciar Usuários',
}

export default function Layout() {
  const location = useLocation()
  const { usuario, logout } = useAuth()
  const [totalAlunos, setTotalAlunos] = useState(null)
  const [menuAberto, setMenuAberto]   = useState(false)
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 1024)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setMenuAberto(false)
  }, [location.pathname])

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/status')
        const d = await r.json()
        setTotalAlunos(d.alunos_cadastrados ?? null)
      } catch { /* silencia */ }
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [])

  const pageTitle = PAGE_TITLES[location.pathname] ?? ''

  return (
    <div className="layout">
      {/* Overlay mobile */}
      {isMobile && menuAberto && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobile ? 'sidebar--mobile' : ''} ${menuAberto ? 'sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6C5CE7" />
                  <stop offset="100%" stopColor="#00D2FF" />
                </linearGradient>
              </defs>
              <path d="M7 3H5a2 2 0 0 0-2 2v2" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 21h2a2 2 0 0 0 2-2v-2" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="10" r="3" stroke="url(#logoGrad)" strokeWidth="2" />
              <path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sidebar__logo-text">
            <span className="sidebar__logo-name">FacePresença</span>
            <span className="sidebar__logo-sub">Reconhecimento facial</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon">{icon}</span>
              <span className="sidebar__link-label">{label}</span>
            </NavLink>
          ))}

          <div className="sidebar__divider" />

          <NavLink
            to="/cadastrar"
            className={({ isActive }) =>
              `sidebar__link sidebar__link--cta ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__link-icon">{CADASTRAR_ICON}</span>
            <span className="sidebar__link-label">Cadastrar</span>
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <div className="sidebar__status">
            <span className="sidebar__status-dot" />
            <span className="sidebar__status-text">
              {totalAlunos !== null ? `${totalAlunos} alunos` : 'carregando…'}
            </span>
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '10px 14px', fontSize: '0.8125rem', marginTop: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
          <div className="sidebar__version" style={{ marginTop: 8 }}>FacePresença v3.0</div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`main ${isMobile ? 'main--mobile' : ''}`}>
        {/* Topbar */}
        <header className="topbar">
          {isMobile && (
            <button
              onClick={() => setMenuAberto(v => !v)}
              className="topbar__menu-btn"
              aria-label="Menu"
            >
              <span className={`topbar__hamburger ${menuAberto ? 'topbar__hamburger--open' : ''}`}>
                <span /><span /><span />
              </span>
            </button>
          )}
          <div className="topbar__title-area">
            <h1 className="topbar__title">{pageTitle}</h1>
          </div>
          <div className="topbar__actions">
            <TopbarExtras location={location} />
            {usuario && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--gradient-main)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                  fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {usuario.nome.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {usuario.nome.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="content">
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Scoped styles */}
      <style>{layoutCSS}</style>
    </div>
  )
}

/* ── Topbar extras ──────────────────────────────────────────────────────── */
function TopbarExtras({ location }) {
  if (location.pathname === '/alunos') {
    return (
      <NavLink to="/cadastrar" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Novo aluno
      </NavLink>
    )
  }
  if (location.pathname === '/') {
    return <HoraBadge />
  }
  return null
}

function HoraBadge() {
  const [hora, setHora] = useState('')
  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('pt-BR'))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="badge badge-blue">{hora}</span>
}

/* ── Layout CSS ─────────────────────────────────────────────────────────── */
const layoutCSS = `
  .layout {
    display: flex;
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* ── Sidebar ──────────────────────────── */
  .sidebar {
    width: var(--sidebar-width);
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transition: transform 0.35s var(--ease-out);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sidebar--mobile {
    transform: translateX(-100%);
    box-shadow: 4px 0 40px rgba(0, 0, 0, 0.5);
    width: 280px;
  }

  .sidebar--mobile.sidebar--open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 99;
    animation: fadeIn 0.25s ease;
  }

  /* Logo */
  .sidebar__logo {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 24px 24px 20px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }

  .sidebar__logo-icon {
    width: 44px;
    height: 44px;
    background: rgba(108, 92, 231, 0.12);
    border: 1px solid rgba(108, 92, 231, 0.20);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sidebar__logo-name {
    display: block;
    font-weight: 700;
    font-size: 1.05rem;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }

  .sidebar__logo-sub {
    display: block;
    font-size: 0.6875rem;
    color: var(--text-muted);
    margin-top: 1px;
  }

  /* Nav links */
  .sidebar__nav {
    flex: 1;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar__link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: var(--radius-sm);
    transition: all 0.2s var(--ease-out);
    position: relative;
  }

  .sidebar__link:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.04);
  }

  .sidebar__link--active {
    color: var(--text-primary);
    background: rgba(108, 92, 231, 0.10);
  }

  .sidebar__link--active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background: var(--gradient-main);
    border-radius: 0 var(--radius-full) var(--radius-full) 0;
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .sidebar__link-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
  }

  .sidebar__link--active .sidebar__link-icon {
    opacity: 1;
    color: var(--accent-light);
  }

  .sidebar__link-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar__divider {
    height: 1px;
    background: var(--border);
    margin: 8px 4px;
  }

  .sidebar__link--cta {
    color: var(--accent-light);
  }

  .sidebar__link--cta:hover {
    background: rgba(108, 92, 231, 0.08);
    color: var(--accent-light);
  }

  /* Footer */
  .sidebar__footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
  }

  .sidebar__status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .sidebar__status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 6px var(--success-glow);
    animation: pulse 2s ease infinite;
  }

  .sidebar__status-text {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .sidebar__version {
    font-family: var(--font-mono);
    font-size: 0.625rem;
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }

  /* ── Main ─────────────────────────────── */
  .main {
    margin-left: var(--sidebar-width);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    transition: margin-left 0.35s var(--ease-out);
  }

  .main--mobile {
    margin-left: 0;
  }

  /* ── Topbar ───────────────────────────── */
  .topbar {
    height: var(--topbar-height);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .topbar__menu-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .topbar__menu-btn:hover {
    border-color: var(--border-hover);
    background: rgba(255, 255, 255, 0.04);
  }

  .topbar__hamburger {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 18px;
  }

  .topbar__hamburger span {
    display: block;
    height: 2px;
    background: var(--text-secondary);
    border-radius: 2px;
    transition: all 0.3s var(--ease-out);
    transform-origin: center;
  }

  .topbar__hamburger--open span:nth-child(1) {
    transform: translateY(6px) rotate(45deg);
  }
  .topbar__hamburger--open span:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }
  .topbar__hamburger--open span:nth-child(3) {
    transform: translateY(-6px) rotate(-45deg);
  }

  .topbar__title-area {
    flex: 1;
    min-width: 0;
  }

  .topbar__title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
  }

  .topbar__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  /* ── Content ──────────────────────────── */
  .content {
    padding: 28px 24px;
    flex: 1;
    max-width: var(--content-max);
    width: 100%;
    margin: 0 auto;
  }

  .page-transition {
    animation: slideUp 0.35s var(--ease-out) both;
  }

  /* ── Responsive ───────────────────────── */
  @media (max-width: 768px) {
    .topbar {
      padding: 0 16px;
      height: 56px;
    }

    .content {
      padding: 20px 16px;
    }

    .topbar__title {
      font-size: 0.9rem;
    }
  }

  @media (max-width: 480px) {
    .content {
      padding: 16px 12px;
    }

    .sidebar--mobile {
      width: 260px;
    }
  }
`
