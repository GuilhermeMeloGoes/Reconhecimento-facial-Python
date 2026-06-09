import { useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function PortalPresencas() {
  const { usuario } = useAuth()

  // Proteger página: apenas alunos podem acessar
  if (!usuario?.aluno_id) {
    return <Navigate to="/portal/filhos" replace />
  }

  return <PresencasContent />
}

function PresencasContent() {
  const { usuario } = useAuth()
  const hoje = new Date()

  const [inicio, setInicio] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`)
  const [fim, setFim]       = useState(hoje.toISOString().split('T')[0])
  const [dados, setDados]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/aluno/minhas-presencas?inicio=${inicio}&fim=${fim}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      setDados(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [inicio, fim])

  // Auto-load on mount
  useState(() => { carregar() })

  const registros = dados?.registros ?? []
  const presentes = dados?.dias_presente ?? 0
  const faltas    = dados?.faltas ?? 0
  const totalDias = dados?.total_dias ?? 0
  const percentual = dados?.percentual ?? 0

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Filters */}
      <div style={s.filterRow} className="fade-in">
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>De</label>
          <input
            className="form-input"
            type="date"
            value={inicio}
            onChange={e => setInicio(e.target.value)}
            style={s.dateInput}
          />
        </div>
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Até</label>
          <input
            className="form-input"
            type="date"
            value={fim}
            onChange={e => setFim(e.target.value)}
            style={s.dateInput}
          />
        </div>
        <button onClick={carregar} className="btn btn-primary" style={{ padding: '10px 20px', alignSelf: 'flex-end' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Buscar
        </button>
      </div>

      {/* Summary cards */}
      <div style={s.summaryGrid} className="stagger">
        <SummaryCard label="Presentes" value={presentes} color="var(--success)" loading={loading} />
        <SummaryCard label="Faltas" value={faltas} color="var(--danger)" loading={loading} />
        <SummaryCard label="Total Dias" value={totalDias} color="var(--accent-light)" loading={loading} />
        <SummaryCard label="Frequência" value={`${percentual}%`} color={percentual >= 75 ? 'var(--success)' : 'var(--warning)'} loading={loading} />
      </div>

      {/* Timeline */}
      <div className="card fade-in">
        <span style={s.sectionLabel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6, opacity: 0.5 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Histórico de presenças
        </span>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 52, borderRadius: 6 }} />)}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '16px 0' }}>
            Erro: {error}
          </div>
        )}

        {!loading && !error && registros.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.4, marginBottom: 8 }}>
              <circle cx="12" cy="12" r="10" /><path d="M8 15s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              Nenhum registro no período selecionado
            </div>
          </div>
        )}

        {!loading && !error && registros.length > 0 && (
          <div style={s.timeline}>
            {registros.map((r, i) => {
              const ts = String(r.timestamp)
              const data = ts.substring(0, 10)
              const hora = ts.includes('T') ? ts.substring(11, 16) : ts.substring(11, 16)

              return (
                <div key={i} className="fade-in" style={{ ...s.timelineItem, animationDelay: `${i * 30}ms` }}>
                  <div style={s.timelineDot(r.tipo)} />
                  <div style={s.timelineContent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={s.timelineDate}>{data}</span>
                      <span className={`tag tag-${r.tipo}`}>
                        {r.tipo === 'entrada' ? '→ entrada' : '← saída'}
                      </span>
                    </div>
                    <div style={s.timelineHora}>{hora}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PDF Download */}
      {!loading && registros.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }} className="fade-in">
          <a
            href={`/api/aluno/meu-relatorio/pdf?inicio=${inicio}&fim=${fim}`}
            className="btn btn-ghost"
            style={{ gap: 8 }}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault()
              const token = localStorage.getItem('access_token')
              fetch(`/api/aluno/meu-relatorio/pdf?inicio=${inicio}&fim=${fim}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              })
                .then(r => r.blob())
                .then(blob => {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `meu_relatorio_${inicio}_${fim}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                })
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Baixar relatório em PDF
          </a>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function SummaryCard({ label, value, color, loading }) {
  return (
    <div className="card" style={{ padding: '14px 16px', cursor: 'default' }}>
      <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      {loading ? (
        <div className="shimmer" style={{ width: 48, height: 24, borderRadius: 4 }} />
      ) : (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.375rem', fontWeight: 700, color, lineHeight: 1 }}>
          {value ?? '--'}
        </div>
      )}
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  filterRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  filterLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  dateInput: {
    width: 150,
    padding: '10px 12px',
    fontSize: '0.8125rem',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 10,
    marginBottom: 20,
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
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    marginTop: 16,
    borderLeft: '2px solid var(--border)',
    marginLeft: 8,
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 16,
    paddingBottom: 16,
    position: 'relative',
  },
  timelineDot: (tipo) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: tipo === 'entrada' ? 'var(--success)' : 'var(--danger)',
    flexShrink: 0,
    marginTop: 4,
    position: 'absolute',
    left: -6,
    boxShadow: tipo === 'entrada' ? '0 0 8px var(--success-glow)' : '0 0 8px var(--danger-glow)',
  }),
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineDate: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  timelineHora: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    marginTop: 2,
  },
}
