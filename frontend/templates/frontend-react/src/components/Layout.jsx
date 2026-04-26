import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/',               icon: '◉', label: 'Dashboard' },
  { path: '/reconhecimento', icon: '⊙', label: 'Reconhecimento' },
  { path: '/alunos',         icon: '≡', label: 'Alunos' },
  { path: '/relatorio',      icon: '▤', label: 'Relatório' },
]

const PAGE_TITLES = {
  '/':               '/ dashboard',
  '/reconhecimento': '/ reconhecimento facial',
  '/alunos':         '/ alunos cadastrados',
  '/cadastrar':      '/ cadastrar aluno',
  '/relatorio':      '/ relatório',
}

export default function Layout() {
  const location = useLocation()
  const [tbOk, setTbOk] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/status')
        const d = await r.json()
        setTbOk(!!d.thingsboard)
      } catch { setTbOk(false) }
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

  const pageTitle = PAGE_TITLES[location.pathname] ?? ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          FACE<br />PRESENÇA
          <span style={styles.logoSub}>Reconhecimento facial</span>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.navIcon}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarStatus}>
          <span className={`dot ${tbOk ? 'dot-on' : 'dot-off'}`} />
          ThingsBoard
        </div>
      </aside>

      <div style={styles.main}>
        <div style={styles.topbar}>
          <h1 style={styles.topbarTitle}>{pageTitle}</h1>
          <TopbarExtras location={location} />
        </div>

        <div style={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function TopbarExtras({ location }) {
  if (location.pathname === '/alunos') {
    return (
      <a href="/cadastrar" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: 11 }}
        onClick={e => { e.preventDefault(); window.history.pushState({}, '', '/cadastrar'); window.dispatchEvent(new PopStateEvent('popstate')) }}>
        ＋ novo aluno
      </a>
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

const styles = {
  sidebar: {
    width: 220,
    background: 'var(--bg2)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 0',
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    zIndex: 100,
  },
  logo: {
    fontFamily: 'var(--mono)',
    fontSize: 13,
    color: 'var(--accent)',
    padding: '0 24px 28px',
    borderBottom: '1px solid var(--border)',
    letterSpacing: '0.05em',
    lineHeight: 1.6,
  },
  logoSub: {
    display: 'block',
    color: 'var(--muted)',
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'var(--mono)',
  },
  nav: {
    marginTop: 20,
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 24px',
    color: 'var(--muted)',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '0.02em',
    transition: 'all .15s',
    borderLeft: '2px solid transparent',
  },
  navLinkActive: {
    color: 'var(--accent)',
    borderLeftColor: 'var(--accent)',
    background: 'rgba(0,229,160,.06)',
  },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  sidebarStatus: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
    fontFamily: 'var(--mono)',
    fontSize: 10,
    color: 'var(--muted)',
  },
  main: {
    marginLeft: 220,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  topbar: {
    height: 56,
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    gap: 12,
    background: 'var(--bg2)',
  },
  topbarTitle: {
    fontFamily: 'var(--mono)',
    fontSize: 13,
    color: 'var(--muted)',
    fontWeight: 400,
    flex: 1,
  },
  content: {
    padding: 32,
    flex: 1,
  },
}