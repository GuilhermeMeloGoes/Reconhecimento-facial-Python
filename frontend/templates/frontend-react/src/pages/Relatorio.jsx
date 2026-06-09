import { useState, useEffect, useCallback } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'

const ABAS = [
  { id: 'registros',   label: 'Registros',       icon: <IconList /> },
  { id: 'faltas',      label: 'Faltas',          icon: <IconX /> },
  { id: 'ocorrencias', label: 'Atrasos / Saídas', icon: <IconAlert /> },
  { id: 'ranking',     label: 'Ranking',         icon: <IconTrophy /> },
]

export default function Relatorio() {
  const hoje = new Date().toISOString().split('T')[0]
  const [data, setData]       = useState(hoje)
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [aba, setAba]         = useState('registros')

  async function downloadRelatorio(url, filename) {
    try {
      const token = localStorage.getItem('access_token')
      let res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.status === 401) {
        // Tenta refresh e retenta
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshToken}`,
            },
          })
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            localStorage.setItem('access_token', refreshData.access_token)
            res = await fetch(url, {
              headers: { 'Authorization': `Bearer ${refreshData.access_token}` },
            })
          } else {
            window.location.href = '/login'
            return
          }
        } else {
          window.location.href = '/login'
          return
        }
      }
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      alert('Erro ao exportar: ' + e.message)
    }
  }

  const carregar = useCallback(async (d = data) => {
    setLoading(true)
    setError(null)
    try {
      const json = await apiFetch(`/api/relatorio?data=${d}`)
      setPayload(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [data])

  useEffect(() => { carregar() }, [carregar])

  const resumo             = payload?.resumo             ?? {}
  const registros          = payload?.registros          ?? []
  const faltas             = payload?.faltas             ?? []
  const atrasos            = payload?.atrasos            ?? []
  const saidas_antecipadas = payload?.saidas_antecipadas ?? []

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* Date filter + Turma + Export */}
      <div style={s.filtroRow} className="fade-in">
        <div style={s.dateWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <input
            className="form-input"
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            style={{ width: 160, padding: '8px 12px', fontSize: '0.8125rem', background: 'var(--bg-elevated)' }}
          />
        </div>
        <button onClick={() => carregar(data)} className="btn btn-ghost" style={{ padding: '8px 18px', fontSize: '0.75rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Filtrar
        </button>

        <div style={{ flex: 1 }} />

        {/* Export buttons */}
        <button
          className="btn btn-ghost"
          style={{ padding: '8px 14px', fontSize: '0.6875rem', gap: 6 }}
          onClick={() => downloadRelatorio(`/api/relatorio/exportar/pdf?data=${data}`, `relatorio_${data}.pdf`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PDF
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: '8px 14px', fontSize: '0.6875rem', gap: 6 }}
          onClick={() => downloadRelatorio(`/api/relatorio/exportar/csv?data=${data}`, `relatorio_${data}.csv`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          CSV
        </button>
      </div>

      {/* Summary cards */}
      <div style={s.resumoGrid} className="stagger">
        <SummaryCard label="Presentes" value={resumo.presentes} color="var(--success)" loading={loading}
          gradient="linear-gradient(135deg, rgba(0,229,160,0.12), rgba(0,210,255,0.04))" />
        <SummaryCard label="Ausentes" value={resumo.ausentes} color="var(--danger)" loading={loading}
          gradient="linear-gradient(135deg, rgba(255,77,109,0.12), rgba(255,184,0,0.04))" />
        <SummaryCard label="Total" value={resumo.total} color="var(--accent-light)" loading={loading}
          gradient="linear-gradient(135deg, rgba(108,92,231,0.12), rgba(0,210,255,0.04))" />
        <SummaryCard label="Atrasos" value={atrasos.length} color="var(--warning)" loading={loading}
          gradient="linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,77,109,0.04))" />
        <SummaryCard label="Saídas ant." value={saidas_antecipadas.length} color="var(--purple)" loading={loading}
          gradient="linear-gradient(135deg, rgba(224,102,255,0.12), rgba(108,92,231,0.04))" />
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {ABAS.map(a => {
          const isActive = aba === a.id
          const badgeCount = a.id === 'faltas' ? faltas.length
            : a.id === 'ocorrencias' ? atrasos.length + saidas_antecipadas.length
            : a.id === 'ranking' ? 0
            : 0
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              style={{
                ...s.tab,
                ...(isActive ? s.tabActive : {}),
              }}
            >
              {a.icon}
              <span className="tab-label-text">{a.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  ...s.tabBadge,
                  background: a.id === 'faltas' ? 'var(--danger)' : 'var(--warning)',
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content card */}
      <div className="card fade-in" style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 44, borderRadius: 6 }} />)}
          </div>
        )}
        {error && <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '16px 0' }}>Erro: {error}</p>}

        {!loading && !error && aba === 'registros' && <TabelaRegistros registros={registros} data={data} />}
        {!loading && !error && aba === 'faltas' && <TabelaFaltas faltas={faltas} data={data} />}
        {!loading && !error && aba === 'ocorrencias' && <TabelaOcorrencias atrasos={atrasos} saidas={saidas_antecipadas} data={data} />}
        {!loading && !error && aba === 'ranking' && <TabelaRanking data={data} />}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .tab-label-text { display: none; }
        }
      `}</style>
    </div>
  )
}

/* ── Sub-tables ─────────────────────────────────────────────────────────── */

function TabelaRegistros({ registros, data }) {
  if (registros.length === 0) return <Vazio msg={`Nenhum registro em ${data}.`} />
  return (
    <div className="table-responsive">
      <table>
      <thead><tr>
        <th>Horário</th><th>Nome</th><th>Matrícula</th><th>Turma</th><th>Evento</th>
      </tr></thead>
      <tbody>
        {registros.map((r, i) => (
          <tr key={i} className="fade-in" style={{ animationDelay: `${i * 30}ms` }}>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {String(r.timestamp).substring(11, 16)}
            </td>
            <td style={{ fontWeight: 500 }}>{r.nome}</td>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{r.matricula}</td>
            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{r.turma || '—'}</td>
            <td>
              <span style={{
                ...s.inlineTag,
                background: r.tipo === 'entrada' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: r.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)',
                borderColor: r.tipo === 'entrada' ? 'rgba(0,229,160,0.15)' : 'rgba(255,77,109,0.15)',
              }}>
                {r.tipo === 'entrada' ? '→ entrada' : '← saída'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

function TabelaFaltas({ faltas, data }) {
  if (faltas.length === 0)
    return <Vazio msg={`Nenhuma falta em ${data}. Todos compareceram!`} icon={<IconCheck />} color="var(--success)" />
  return (
    <>
      <div style={s.alertBanner}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <strong>{faltas.length}</strong> aluno{faltas.length > 1 ? 's' : ''} sem registro em {data}
      </div>
      <div className="table-responsive">
        <table>
        <thead><tr><th>Nome</th><th>Matrícula</th><th>Turma</th><th>Status</th></tr></thead>
        <tbody>
          {faltas.map((a, i) => (
            <tr key={i} className="fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <td style={{ fontWeight: 500 }}>{a.nome}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{a.matricula}</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{a.turma || '—'}</td>
              <td>
                <span style={{ ...s.inlineTag, background: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'rgba(255,77,109,0.15)' }}>
                  ✗ ausente
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  )
}

function TabelaOcorrencias({ atrasos, saidas, data }) {
  const total = atrasos.length + saidas.length
  if (total === 0)
    return <Vazio msg={`Nenhuma ocorrência em ${data}. Todos no horário!`} icon={<IconCheck />} color="var(--success)" />

  return (
    <div>
      {atrasos.length > 0 && (
        <>
          <SectionHeader icon={<IconClock color="#FFB800" />} label={`Atrasos (${atrasos.length})`} color="var(--warning)"
            desc="Alunos que chegaram após o horário esperado" />
          <div className="table-responsive">
            <table style={{ marginBottom: 28 }}>
            <thead><tr><th>Chegada</th><th>Nome</th><th>Matrícula</th><th>Turma</th><th>Atraso</th></tr></thead>
            <tbody>
              {atrasos.map((a, i) => (
                <tr key={i} className="fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)', fontSize: '0.8125rem' }}>
                    {String(a.timestamp).substring(11, 16)}
                  </td>
                  <td style={{ fontWeight: 500 }}>{a.nome}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{a.matricula}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{a.turma || '—'}</td>
                  <td>
                    <span style={{ ...s.inlineTag, background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'rgba(255,184,0,0.15)' }}>
                      +{a.minutos_atraso} min
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}

      {saidas.length > 0 && (
        <>
          <SectionHeader icon={<IconDoor color="#E066FF" />} label={`Saídas antecipadas (${saidas.length})`} color="var(--purple)"
            desc="Alunos que saíram antes do horário previsto" />
          <div className="table-responsive">
            <table>
            <thead><tr><th>Saída</th><th>Nome</th><th>Matrícula</th><th>Turma</th><th>Antecipação</th></tr></thead>
            <tbody>
              {saidas.map((ss, i) => (
                <tr key={i} className="fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--purple)', fontSize: '0.8125rem' }}>
                    {String(ss.timestamp).substring(11, 16)}
                  </td>
                  <td style={{ fontWeight: 500 }}>{ss.nome}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{ss.matricula}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{ss.turma || '—'}</td>
                  <td>
                    <span style={{ ...s.inlineTag, background: 'var(--purple-bg)', color: 'var(--purple)', borderColor: 'rgba(224,102,255,0.15)' }}>
                      -{ss.minutos_cedo} min
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function SummaryCard({ label, value, color, gradient, loading }) {
  return (
    <div className="card" style={{ background: gradient, padding: '16px 18px', cursor: 'default' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      {loading ? (
        <div className="shimmer" style={{ width: 48, height: 28, borderRadius: 6 }} />
      ) : (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.625rem', fontWeight: 700, color, lineHeight: 1 }}>
          {value ?? '--'}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ icon, label, color, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '12px 0 4px' }}>
      {icon}
      <div>
        <div style={{ fontWeight: 700, color, fontSize: '0.875rem' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  )
}

function Vazio({ msg, icon, color = 'var(--text-muted)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 8 }}>
      {icon || (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.4 }}>
          <circle cx="12" cy="12" r="10" /><path d="M8 15s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      )}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{msg}</span>
    </div>
  )
}

/* ── Icons ────────────────────────────────────────────────────────────── */

function IconTrophy() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function TabelaRanking({ data }) {
  const [ranking, setRanking] = useState([])
  const [loadingR, setLoadingR] = useState(true)

  useEffect(() => {
    const inicio = data.substring(0, 7) + '-01'
    apiFetch(`/api/relatorio/ranking?inicio=${inicio}&fim=${data}`)
      .then(d => { setRanking(d); setLoadingR(false) })
      .catch(() => setLoadingR(false))
  }, [data])

  if (loadingR) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 44, borderRadius: 6 }} />)}
    </div>
  )

  if (ranking.length === 0) return <Vazio msg="Nenhum dado de frequência para gerar ranking." />

  return (
    <table>
      <thead><tr>
        <th style={{ width: 50 }}>#</th><th>Nome</th><th>Matrícula</th><th>Turma</th><th>Presenças</th><th>Frequência</th>
      </tr></thead>
      <tbody>
        {ranking.map((r, i) => (
          <tr key={i} className="fade-in" style={{ animationDelay: `${i * 30}ms` }}>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: i < 3 ? 'var(--warning)' : 'var(--text-muted)' }}>
              {i < 3 ? ['🥇', '🥈', '🥉'][i] : r.posicao}
            </td>
            <td style={{ fontWeight: 500 }}>{r.nome}</td>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{r.matricula}</td>
            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{r.turma}</td>
            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{r.dias_presente}/{r.total_dias}</td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${r.percentual}%`,
                    background: r.percentual >= 75 ? 'linear-gradient(90deg, #00E5A0, #00D2FF)' : 'linear-gradient(90deg, #FFB800, #FF4D6D)',
                    transition: 'width 0.5s var(--ease-out)',
                  }} />
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600,
                  color: r.percentual >= 75 ? 'var(--success)' : 'var(--warning)',
                  minWidth: 42, textAlign: 'right',
                }}>{r.percentual}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function IconList() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.5 }}>
      <circle cx="12" cy="12" r="10" /><polyline points="16 8.5 10.5 14.5 8 12" />
    </svg>
  )
}

function IconClock({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconDoor({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  filtroRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  dateWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  resumoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  tabRow: {
    display: 'flex',
    gap: 0,
  },
  tab: {
    padding: '10px 20px',
    border: '1px solid var(--border)',
    borderBottom: 'none',
    background: 'var(--bg-base)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderTopLeftRadius: 'var(--radius-sm)',
    borderTopRightRadius: 'var(--radius-sm)',
    transition: 'all 0.2s',
    marginRight: -1,
  },
  tabActive: {
    background: 'var(--glass-bg)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border)',
    borderBottomColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  tabBadge: {
    color: '#fff',
    borderRadius: 'var(--radius-full)',
    padding: '1px 7px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  inlineTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.6875rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    border: '1px solid',
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'var(--danger-bg)',
    border: '1px solid rgba(255,77,109,0.15)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 16,
    fontSize: '0.8125rem',
    color: 'var(--danger)',
  },
}
