import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'

export default function PortalDashboard() {
  const { usuario } = useAuth()
  const aluno_id = usuario?.aluno_id

  const hoje = new Date()
  const inicioMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const fimMes    = hoje.toISOString().split('T')[0]

  const { data: presencas, loading: loadingP } = useApi(
    aluno_id ? `/api/aluno/minhas-presencas?inicio=${inicioMes}&fim=${fimMes}` : null,
    30000
  )

  const { data: calendario, loading: loadingC } = useApi(
    aluno_id ? `/api/aluno/calendario?ano=${hoje.getFullYear()}&mes=${hoje.getMonth() + 1}` : null,
    60000
  )

  const { data: perfil } = useApi(
    aluno_id ? '/api/aluno/meu-perfil' : null
  )

  const aluno = perfil?.aluno || {}
  const diasPresente  = presencas?.dias_presente  ?? 0
  const faltas        = presencas?.faltas          ?? 0
  const totalDias     = presencas?.total_dias      ?? 0
  const percentual    = presencas?.percentual       ?? 0
  const registros     = presencas?.registros        ?? []
  const diasCalendario = calendario?.dias_presentes ?? []

  const ultimosRegistros = useMemo(() => {
    return [...registros]
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
      .slice(0, 5)
  }, [registros])

  if (!aluno_id) {
    return (
      <div className="card fade-in" style={{ textAlign: 'center', padding: 48 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.6 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Nenhum aluno vinculado a esta conta.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Contate o administrador.</p>
      </div>
    )
  }

  const isLoading = loadingP || loadingC

  return (
    <>
      {/* Welcome card */}
      <div className="card card-glow fade-in" style={s.welcomeCard}>
        <div style={s.welcomeInner}>
          <div style={s.welcomeAvatar}>
            {(aluno.nome || usuario?.nome || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={s.welcomeTitle}>
              Olá, {(aluno.nome || usuario?.nome || 'Aluno').split(' ')[0]}! 👋
            </div>
            <div style={s.welcomeSub}>
              {aluno.matricula && <span>Matrícula: {aluno.matricula}</span>}
              {aluno.turma && <span> · Turma: {aluno.turma}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid-3 mb-6 stagger" style={{ marginTop: 20 }}>
        <MetricCard
          label="Frequência"
          value={`${percentual}%`}
          loading={isLoading}
          color={percentual >= 75 ? 'var(--success)' : percentual >= 50 ? 'var(--warning)' : 'var(--danger)'}
          gradient={`linear-gradient(135deg, ${percentual >= 75 ? 'rgba(0,229,160,0.12)' : 'rgba(255,184,0,0.12)'}, rgba(0,210,255,0.04))`}
        />
        <MetricCard
          label="Dias presente"
          value={diasPresente}
          loading={isLoading}
          color="var(--success)"
          gradient="linear-gradient(135deg, rgba(0,229,160,0.12), rgba(0,210,255,0.04))"
        />
        <MetricCard
          label="Faltas"
          value={faltas}
          loading={isLoading}
          color="var(--danger)"
          gradient="linear-gradient(135deg, rgba(255,77,109,0.12), rgba(255,184,0,0.04))"
        />
      </div>

      {/* Frequency bar */}
      <div className="card fade-in" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={s.sectionLabel}>Frequência no mês</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: percentual >= 75 ? 'var(--success)' : 'var(--warning)' }}>
            {percentual}%
          </span>
        </div>
        <div style={s.progressBg}>
          <div style={{
            ...s.progressFill,
            width: `${Math.min(percentual, 100)}%`,
            background: percentual >= 75
              ? 'linear-gradient(90deg, #00E5A0, #00D2FF)'
              : percentual >= 50
                ? 'linear-gradient(90deg, #FFB800, #FF8C00)'
                : 'linear-gradient(90deg, #FF4D6D, #FF8C00)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {diasPresente} de {totalDias} dias letivos
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: percentual >= 75 ? 'var(--success)' : 'var(--danger)' }}>
            {percentual >= 75 ? '✓ Regular' : '⚠ Atenção'}
          </span>
        </div>
      </div>

      <div className="grid-2 stagger">
        {/* Calendar */}
        <div className="card">
          <span style={s.sectionLabel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6, opacity: 0.5 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Calendário — {meses[hoje.getMonth()]}
          </span>
          <CalendarioMini
            ano={hoje.getFullYear()}
            mes={hoje.getMonth()}
            diasPresentes={diasCalendario}
            loading={loadingC}
          />
        </div>

        {/* Last records */}
        <div className="card">
          <span style={s.sectionLabel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6, opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Últimos registros
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {loadingP ? (
              [1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 44, borderRadius: 6 }} />)
            ) : ultimosRegistros.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                Nenhum registro encontrado
              </div>
            ) : (
              ultimosRegistros.map((r, i) => (
                <div key={i} className="fade-in" style={{ ...s.recordItem, animationDelay: `${i * 60}ms` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatTimestamp(r.timestamp)}
                    </div>
                  </div>
                  <span className={`tag tag-${r.tipo}`}>
                    {r.tipo === 'entrada' ? '→ entrada' : '← saída'}
                  </span>
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

function MetricCard({ label, value, loading, color, gradient }) {
  return (
    <div className="card" style={{ background: gradient, cursor: 'default' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      {loading ? (
        <div className="shimmer" style={{ width: 60, height: 28, borderRadius: 6 }} />
      ) : (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.625rem', fontWeight: 700, color, lineHeight: 1 }}>
          {value ?? '--'}
        </div>
      )}
    </div>
  )
}

function CalendarioMini({ ano, mes, diasPresentes, loading }) {
  const diasDoMes = new Date(ano, mes + 1, 0).getDate()
  const primeiroDia = new Date(ano, mes, 1).getDay()

  const cells = []
  for (let i = 0; i < primeiroDia; i++) {
    cells.push(<div key={`empty-${i}`} style={s.calCell} />)
  }

  const hojeStr = new Date().toISOString().split('T')[0]

  for (let d = 1; d <= diasDoMes; d++) {
    const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isPresente = diasPresentes.includes(dateStr)
    const isHoje = dateStr === hojeStr
    const isPast = new Date(dateStr) < new Date(hojeStr) && !isPresente
    const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6

    let bg = 'transparent'
    let color = 'var(--text-muted)'
    let border = '1px solid transparent'

    if (isPresente) {
      bg = 'rgba(0,229,160,0.15)'
      color = 'var(--success)'
      border = '1px solid rgba(0,229,160,0.25)'
    } else if (isPast && !isWeekend) {
      bg = 'rgba(255,77,109,0.08)'
      color = 'var(--danger)'
      border = '1px solid rgba(255,77,109,0.12)'
    }

    if (isHoje) {
      border = '2px solid var(--cyan)'
    }

    cells.push(
      <div
        key={d}
        style={{
          ...s.calCell,
          background: bg,
          color,
          border,
          fontWeight: isPresente || isHoje ? 700 : 400,
        }}
        title={isPresente ? `Presente em ${dateStr}` : isPast && !isWeekend ? `Ausente em ${dateStr}` : dateStr}
      >
        {d}
      </div>
    )
  }

  if (loading) {
    return <div className="shimmer" style={{ height: 200, borderRadius: 8, marginTop: 12 }} />
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={s.calHeader}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} style={s.calHeaderCell}>{d}</div>
        ))}
      </div>
      <div style={s.calGrid}>{cells}</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
        <div style={s.legend}><div style={{ ...s.legendDot, background: 'var(--success)' }} /> Presente</div>
        <div style={s.legend}><div style={{ ...s.legendDot, background: 'var(--danger)' }} /> Ausente</div>
        <div style={s.legend}><div style={{ ...s.legendDot, border: '2px solid var(--cyan)', background: 'transparent' }} /> Hoje</div>
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatTimestamp(ts) {
  const str = String(ts)
  if (str.includes('T')) {
    return str.substring(0, 10) + ' ' + str.substring(11, 16)
  }
  return str.substring(0, 16)
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  welcomeCard: {
    background: 'linear-gradient(135deg, rgba(0,229,160,0.08), rgba(0,210,255,0.04))',
    border: '1px solid rgba(0,229,160,0.15)',
  },
  welcomeInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  welcomeAvatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00E5A0, #00D2FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#000',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(0,229,160,0.3)',
  },
  welcomeTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  welcomeSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
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
  progressBg: {
    width: '100%',
    height: 8,
    borderRadius: 'var(--radius-full)',
    background: 'var(--bg-elevated)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width 1s var(--ease-out)',
  },
  recordItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
  },
  calHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
    marginBottom: 4,
  },
  calHeaderCell: {
    textAlign: 'center',
    fontSize: '0.625rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    padding: 4,
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
  },
  calCell: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6875rem',
    fontFamily: 'var(--font-mono)',
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.2s',
    cursor: 'default',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.625rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
}
