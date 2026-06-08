import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function PortalFilhos() {
  const { usuario } = useAuth()
  const [filhos, setFilhos] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [relatorio, setRelatorio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    carregarFilhos()
  }, [])

  async function carregarFilhos() {
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/parent/me', { headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data = await res.json()
      setFilhos(data.filhos || [])
    } catch (e) {
      setError(e.message)
    }
  }

  async function verRelatorio(aluno) {
    setSelecionado(aluno)
    setLoading(true)
    setRelatorio(null)
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const hoje = new Date().toISOString().split('T')[0]
      const inicio = `${hoje.substring(0,8)}01`
      const res = await fetch(`/api/parent/children/${aluno.id}/attendance?inicio=${inicio}&fim=${hoje}`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data = await res.json()
      setRelatorio(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2>Meus filhos</h2>
      {error && <div style={{ color: 'var(--danger)' }}>Erro: {error}</div>}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: '0 0 320px' }}>
          <div className="card">
            {filhos.length === 0 && <div style={{ padding: 16 }}>Nenhum filho vinculado.</div>}
            {filhos.map(f => (
              <div key={f.id} style={{ padding: 10, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{f.nome}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{f.matricula} — {f.turma}</div>
                </div>
                <button className="btn" onClick={() => verRelatorio(f)}>Ver faltas</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="card">
            {!selecionado && <div style={{ padding: 16 }}>Selecione um filho para ver detalhes de faltas e presença.</div>}
            {selecionado && loading && <div style={{ padding: 16 }}>Carregando...</div>}
            {selecionado && relatorio && (
              <div>
                <h3 style={{ marginTop: 0 }}>{selecionado.nome} — Relatório</h3>
                <div>Período: {relatorio.inicio} → {relatorio.fim}</div>
                <div style={{ marginTop: 12 }}>
                  <strong>Faltas:</strong> {relatorio.faltas ?? 0} — <strong>Presenças:</strong> {relatorio.dias_presente ?? 0}
                </div>
                <div style={{ marginTop: 12 }}>
                  <details>
                    <summary>Ver registros</summary>
                    <ul>
                      {(relatorio.registros || []).map(r => (
                        <li key={r.id}>{String(r.timestamp).substring(0,10)} — {r.tipo}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
