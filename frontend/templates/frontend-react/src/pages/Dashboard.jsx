import { useApi } from '../hooks/useApi'

export default function Dashboard() {
  const { data: presentes = [], loading: loadingP } = useApi('/api/presentes', 5000)
  const { data: resumo = {}, loading: loadingR }    = useApi('/api/resumo',    5000)
  const { data: atividades = [], loading: loadingA } = useApi('/api/atividades', 5000)

  const isLoading = loadingP || loadingR || loadingA

  return (
    <>
      {/* Metric cards */}
      <div className="grid-3 mb-6 stagger">
        <MetricCard
          label="Presentes hoje"
          value={resumo.presentes}
          loading={loadingR}
          color="var(--success)"
          gradient="linear-gradient(135deg, rgba(0,229,160,0.12) 0%, rgba(0,210,255,0.06) 100%)"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
          }
        />
        <MetricCard
          label="Ausentes"
          value={resumo.ausentes}
          loading={loadingR}
          color="var(--danger)"
          gradient="linear-gradient(135deg, rgba(255,77,109,0.12) 0%, rgba(255,184,0,0.06) 100%)"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="17" y1="8" x2="23" y2="14" />
              <line x1="23" y1="8" x2="17" y2="14" />
            </svg>
          }
        />
        <MetricCard
          label="Total cadastrado"
          value={resumo.total}
          loading={loadingR}
          color="var(--accent-light)"
          gradient="linear-gradient(135deg, rgba(108,92,231,0.12) 0%, rgba(0,210,255,0.06) 100%)"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>

      {/* Lists */}
      <div className="grid-2 stagger">
        {/* Recent Activity */}
        <div className="card card-glow">
          <div className="flex items-center justify-between mb-4">
            <span style={s.sectionLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6, opacity: 0.5 }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Atividade recente
            </span>
            <span className="badge badge-blue" style={{ animation: 'pulse 2s ease infinite' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)', marginRight: 4, display: 'inline-block' }} />
              LIVE
            </span>
          </div>
          <div style={s.list}>
            {loadingA ? (
              <ShimmerRows count={3} />
            ) : atividades.length === 0 ? (
              <EmptyState text="Aguardando registros..." />
            ) : (
              atividades.map((a, i) => (
                <div key={i} className="fade-in" style={{ ...s.item, animationDelay: `${i * 60}ms` }}>
                  <Avatar nome={a.nome} />
                  <div style={s.info}>
                    <div style={s.nome}>{a.nome}</div>
                    <div style={s.meta}>
                      {a.tipo.toUpperCase()} · {a.timestamp.substring(11, 19)}
                    </div>
                  </div>
                  <span className={`tag tag-${a.tipo}`}>{a.tipo}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Currently present */}
        <div className="card card-glow">
          <div className="flex items-center justify-between mb-4">
            <span style={s.sectionLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6, opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Presentes agora
            </span>
            <a href="/relatorio" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.6875rem' }}>
              Ver relatório →
            </a>
          </div>
          <div style={s.list}>
            {loadingP ? (
              <ShimmerRows count={3} />
            ) : presentes.length === 0 ? (
              <EmptyState text="Nenhum aluno detectado hoje." />
            ) : (
              presentes.map((p, i) => (
                <div key={i} className="fade-in" style={{ ...s.item, animationDelay: `${i * 60}ms` }}>
                  <Avatar nome={p.nome} />
                  <div style={s.info}>
                    <div style={s.nome}>{p.nome}</div>
                    <div style={s.meta}>
                      {p.matricula} · {p.turma || '—'} · {p.entrada_em.substring(11, 16)}
                    </div>
                  </div>
                  <span className="tag tag-entrada">dentro</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function MetricCard({ label, value, loading, color, gradient, icon }) {
  return (
    <div className="card card-glow" style={{ background: gradient, cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={s.metricLabel}>{label}</div>
        <div style={{ color, opacity: 0.6 }}>{icon}</div>
      </div>
      {loading ? (
        <div className="shimmer" style={{ width: 60, height: 36, borderRadius: 8 }} />
      ) : (
        <div style={{ ...s.metricValue, color }}>{value ?? '--'}</div>
      )}
    </div>
  )
}

function Avatar({ nome }) {
  return (
    <div style={s.avatar}>
      {nome.charAt(0).toUpperCase()}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={s.empty}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.4, marginBottom: 8 }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 15s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {text}
      </span>
    </div>
  )
}

function ShimmerRows({ count = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="shimmer" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />
  ))
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  sectionLabel: {
    fontFamily: 'var(--font-sans)',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 340,
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    transition: 'all 0.2s ease',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--gradient-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
    boxShadow: '0 2px 8px var(--accent-glow)',
  },
  info: { flex: 1, minWidth: 0 },
  nome: {
    fontSize: '0.875rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'var(--text-primary)',
  },
  meta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 0',
    gap: 4,
  },
}