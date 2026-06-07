import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function PortalRelatorio() {
  const { usuario } = useAuth()
  const hoje = new Date()

  const [inicio, setInicio] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`)
  const [fim, setFim]       = useState(hoje.toISOString().split('T')[0])
  const [dados, setDados]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const carregar = useCallback(async () => {
    if (!usuario?.aluno_id) return
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/relatorio/individual/${usuario.aluno_id}?inicio=${inicio}&fim=${fim}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      setDados(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [inicio, fim, usuario])

  useState(() => { carregar() })

  const registros  = dados?.registros ?? []
  const presentes  = dados?.dias_presente ?? 0
  const faltas     = dados?.faltas ?? 0
  const totalDias  = dados?.total_dias ?? 0
  const percentual = dados?.percentual ?? 0

  // Group by date for chart
  const chartData = useMemo(() => {
    const byDate = {}
    registros.forEach(r => {
      const ts = String(r.timestamp)
      const date = ts.substring(0, 10)
      if (!byDate[date]) byDate[date] = { entradas: 0, saidas: 0 }
      if (r.tipo === 'entrada') byDate[date].entradas++
      else byDate[date].saidas++
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // Last 14 days with records
  }, [registros])

  // Atrasos: entrada after 07:45
  const atrasos = useMemo(() => {
    return registros.filter(r => {
      if (r.tipo !== 'entrada') return false
      const ts = String(r.timestamp)
      const hora = ts.includes('T') ? ts.substring(11, 16) : ts.substring(11, 16)
      return hora > '07:45'
    })
  }, [registros])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Filters */}
      <div style={s.filterRow} className="fade-in">
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>De</label>
          <input className="form-input" type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={s.dateInput} />
        </div>
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Até</label>
          <input className="form-input" type="date" value={fim} onChange={e => setFim(e.target.value)} style={s.dateInput} />
        </div>
        <button onClick={carregar} className="btn btn-primary" style={{ padding: '10px 20px', alignSelf: 'flex-end' }}>
          Gerar relatório
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 60, borderRadius: 8 }} />)}
        </div>
      )}

      {error && (
        <div className="card fade-in" style={{ color: 'var(--danger)', textAlign: 'center', padding: 32 }}>
          Erro: {error}
        </div>
      )}

      {!loading && !error && dados && (
        <>
          {/* Summary */}
          <div className="card card-glow fade-in" style={{ marginBottom: 20 }}>
            <div style={s.summaryTitle}>Resumo de Frequência</div>
            <div style={s.summaryGrid}>
              <div style={s.summaryItem}>
                <div style={{ ...s.summaryValue, color: 'var(--success)' }}>{presentes}</div>
                <div style={s.summaryLabel}>Presenças</div>
              </div>
              <div style={s.summaryItem}>
                <div style={{ ...s.summaryValue, color: 'var(--danger)' }}>{faltas}</div>
                <div style={s.summaryLabel}>Faltas</div>
              </div>
              <div style={s.summaryItem}>
                <div style={{ ...s.summaryValue, color: 'var(--accent-light)' }}>{totalDias}</div>
                <div style={s.summaryLabel}>Dias letivos</div>
              </div>
              <div style={s.summaryItem}>
                <div style={{ ...s.summaryValue, color: percentual >= 75 ? 'var(--success)' : 'var(--warning)' }}>
                  {percentual}%
                </div>
                <div style={s.summaryLabel}>Frequência</div>
              </div>
            </div>

            {/* Progress */}
            <div style={{ marginTop: 16 }}>
              <div style={s.progressBg}>
                <div style={{
                  ...s.progressFill,
                  width: `${Math.min(percentual, 100)}%`,
                  background: percentual >= 75
                    ? 'linear-gradient(90deg, #00E5A0, #00D2FF)'
                    : 'linear-gradient(90deg, #FFB800, #FF4D6D)',
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {percentual >= 75 ? '✓ Frequência regular' : '⚠ Frequência abaixo do esperado (75%)'}
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card fade-in" style={{ marginBottom: 20 }}>
              <div style={s.sectionLabel}>Atividade por dia</div>
              <div style={s.chart}>
                {chartData.map(([date, counts], i) => {
                  const total = counts.entradas + counts.saidas
                  const maxVal = Math.max(...chartData.map(([, c]) => c.entradas + c.saidas), 1)
                  const height = Math.max((total / maxVal) * 120, 8)

                  return (
                    <div key={date} className="fade-in" style={{ ...s.chartCol, animationDelay: `${i * 40}ms` }}>
                      <div style={{ ...s.chartBar, height }} title={`${date}: ${counts.entradas} entrada(s), ${counts.saidas} saída(s)`} />
                      <div style={s.chartLabel}>{date.substring(8, 10)}/{date.substring(5, 7)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Late arrivals */}
          {atrasos.length > 0 && (
            <div className="card fade-in" style={{ marginBottom: 20 }}>
              <div style={s.sectionLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6 }}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Atrasos ({atrasos.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {atrasos.map((r, i) => {
                  const ts = String(r.timestamp)
                  return (
                    <div key={i} style={s.atrasoItem} className="fade-in">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ts.substring(0, 10)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--warning)', fontWeight: 600 }}>
                        {ts.includes('T') ? ts.substring(11, 16) : ts.substring(11, 16)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Download PDF */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }} className="fade-in">
            <button
              className="btn btn-primary"
              style={{ gap: 8 }}
              onClick={() => {
                const token = localStorage.getItem('access_token')
                fetch(`/api/aluno/meu-relatorio/pdf?inicio=${inicio}&fim=${fim}`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                })
                  .then(r => r.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `relatorio_${inicio}_${fim}.pdf`
                    a.click()
                    URL.revokeObjectURL(url)
                  })
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Baixar PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  filterRow: {
    display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap',
  },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  filterLabel: { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dateInput: { width: 150, padding: '10px 12px', fontSize: '0.8125rem' },
  summaryTitle: {
    fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  summaryItem: { textAlign: 'center' },
  summaryValue: { fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, marginBottom: 4 },
  summaryLabel: { fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  progressBg: { width: '100%', height: 8, borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 'var(--radius-full)', transition: 'width 1s var(--ease-out)' },
  sectionLabel: {
    fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
    letterSpacing: '0.03em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', marginBottom: 4,
  },
  chart: {
    display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, marginTop: 12,
    paddingBottom: 24, borderBottom: '1px solid var(--border)', position: 'relative',
  },
  chartCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  chartBar: {
    width: '100%', maxWidth: 32, borderRadius: '4px 4px 0 0',
    background: 'linear-gradient(180deg, #00E5A0, #00D2FF)',
    transition: 'height 0.5s var(--ease-out)',
    minHeight: 4,
  },
  chartLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' },
  atrasoItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', background: 'rgba(255,184,0,0.06)',
    border: '1px solid rgba(255,184,0,0.12)', borderRadius: 'var(--radius-sm)',
  },
}
