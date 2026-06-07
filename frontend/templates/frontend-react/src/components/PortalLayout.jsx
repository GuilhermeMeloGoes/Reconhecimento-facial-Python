import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  {
    path: '/portal',
    label: 'Meu Painel',
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
    path: '/portal/presencas',
    label: 'Presenças',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    path: '/portal/relatorio',
    label: 'Relatório',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
]

const PAGE_TITLES = {
  '/portal':            'Meu Painel',
  '/portal/presencas':  'Minhas Presenças',
  '/portal/relatorio':  'Meu Relatório',
}

export default function PortalLayout() {
  const location = useLocation()
  const { usuario, logout } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 1024)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setMenuAberto(false)
  }, [location.pathname])

  const pageTitle = PAGE_TITLES[location.pathname] ?? ''

  return (
    <div className="layout">
      {isMobile && menuAberto && (
        <div className="sidebar-overlay" onClick={() => setMenuAberto(false)} />
      )}

      <aside className={`sidebar portal-sidebar ${isMobile ? 'sidebar--mobile' : ''} ${menuAberto ? 'sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon" style={{ background: 'rgba(0,229,160,0.12)', borderColor: 'rgba(0,229,160,0.2)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="portalLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00E5A0" />
                  <stop offset="100%" stopColor="#00D2FF" />
                </linearGradient>
              </defs>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="url(#portalLogo)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" stroke="url(#portalLogo)" strokeWidth="2" />
              <polyline points="16 11 18 13 22 9" stroke="url(#portalLogo)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sidebar__logo-text">
            <span className="sidebar__logo-name" style={{ background: 'linear-gradient(135deg, #00E5A0, #00D2FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Portal do Aluno
            </span>
            <span className="sidebar__logo-sub">{usuario?.nome || 'Aluno'}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/portal'}
              className={({ isActive }) =>
                `sidebar__link portal-link ${isActive ? 'sidebar__link--active portal-link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon">{icon}</span>
              <span className="sidebar__link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '10px 14px', fontSize: '0.8125rem' }}
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

      {/* Main */}
      <div className={`main ${isMobile ? 'main--mobile' : ''}`}>
        <header className="topbar">
          {isMobile && (
            <button onClick={() => setMenuAberto(v => !v)} className="topbar__menu-btn" aria-label="Menu">
              <span className={`topbar__hamburger ${menuAberto ? 'topbar__hamburger--open' : ''}`}>
                <span /><span /><span />
              </span>
            </button>
          )}
          <div className="topbar__title-area">
            <h1 className="topbar__title">{pageTitle}</h1>
          </div>
          <div className="topbar__actions">
            <div style={ps.userBadge}>
              <div style={ps.userAvatar}>
                {(usuario?.nome || 'A').charAt(0).toUpperCase()}
              </div>
              <span style={ps.userName}>{usuario?.nome || 'Aluno'}</span>
            </div>
          </div>
        </header>

        <main className="content">
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{portalCSS}</style>
    </div>
  )
}

const ps = {
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00E5A0, #00D2FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#000',
    flexShrink: 0,
  },
  userName: {
    fontFamily: 'var(--font-sans)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
}

const portalCSS = `
  .portal-sidebar .sidebar__link--active {
    background: rgba(0, 229, 160, 0.10);
  }

  .portal-sidebar .sidebar__link--active::before {
    background: linear-gradient(135deg, #00E5A0, #00D2FF);
    box-shadow: 0 0 8px rgba(0, 229, 160, 0.35);
  }

  .portal-sidebar .sidebar__link--active .sidebar__link-icon {
    color: #00E5A0;
  }

  @media (max-width: 640px) {
    .portal-user-name { display: none; }
  }
`
