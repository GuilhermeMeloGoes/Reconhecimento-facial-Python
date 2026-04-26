import { useState, useEffect, useCallback } from 'react'

export default function Relatorio() {
  const hoje = new Date().toISOString().split('T')[0]
  const [data, setData]         = useState(hoje)
  const [payload, setPayload]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const carregarRelatorio = useCallback(async (d = data) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/relatorio?data=${d}`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const json = await res.json()
      setPayload(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [data])

  useEffect(() => {
    const initialFetchId = setTimeout(() => {
      carregarRelatorio()
    }, 0)
    return () => clearTimeout(initialFetchId)
  }, [carregarRelatorio])

  function handleFiltrar() { carregarRelatorio(data) }

  const resumo    = payload?.resumo    ?? {}
  const registros = payload?.registros ?? []

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
        <input
          className="form-input"
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
          style={{ width: 160, padding: '6px 10px', fontSize: 12 }}
        />
        <button onClick={handleFiltrar} className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 11 }}>
          filtrar
        </button>
      </div>

      <div style={styles.resumoRow}>
        <Pill label="presentes" value={resumo.presentes} color="var(--accent)" />
        <Pill label="ausentes"  value={resumo.ausentes}  color="var(--danger)" />
        <Pill label="total"     value={resumo.total}     color="var(--muted)"  />
      </div>

      <div className="card">
        {loading && (
          <p className="text-muted mono" style={{ fontSize: 12, padding: '16px 0' }}>Carregando relatório...</p>
        )}

        {error && (
          <p className="text-danger mono" style={{ fontSize: 12, padding: '16px 0' }}>Erro ao carregar relatório.</p>
        )}

        {!loading && !error && registros.length === 0 && (
          <p className="text-muted mono" style={{ fontSize: 12, padding: '16px 0' }}>
            Nenhum registro encontrado para {data}.
          </p>
        )}

        {!loading && !error && registros.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>horário</th>
                <th>nome</th>
                <th>matrícula</th>
                <th>turma</th>
                <th>evento</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={i}>
                  <td className="mono text-muted" style={{ fontSize: 12 }}>
                    {r.timestamp.substring(11, 16)}
                  </td>
                  <td>{r.nome}</td>
                  <td className="mono">{r.matricula}</td>
                  <td className="mono text-muted">{r.turma || '—'}</td>
                  <td><span className={`tag tag-${r.tipo}`}>{r.tipo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function Pill({ label, value, color }) {
  return (
    <div style={styles.pill}>
      <div style={styles.pillLabel}>{label}</div>
      <div style={{ ...styles.pillValue, color }}>{value ?? '--'}</div>
    </div>
  )
}

const styles = {
  resumoRow: { display: 'flex', gap: 16, marginBottom: 24 },
  pill: {
    flex: 1,
    padding: '16px 20px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 7,
    fontFamily: 'var(--mono)',
  },
  pillLabel: {
    fontSize: 10,
    color: 'var(--muted)',
    marginBottom: 4,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
  },
  pillValue: { fontSize: 28, fontWeight: 700 },
}