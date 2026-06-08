import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminVinculos() {
  const { usuario } = useAuth()
  const [links, setLinks] = useState([])
  const [alunos, setAlunos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ usuario_id: '', aluno_id: '' })

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const token = localStorage.getItem('access_token')
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/admin/parent-links', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/alunos', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/auth/usuarios', { headers: { 'Authorization': `Bearer ${token}` } }),
      ])
      if (!r1.ok) throw new Error('Permissão negada ou erro ao listar links')
      const linksData = await r1.json()
      const alunosData = r2.ok ? await r2.json() : []
      const usuariosData = r3.ok ? await r3.json() : []
      setLinks(linksData)
      setAlunos(alunosData)
      setUsuarios(usuariosData)
    } catch (e) {
      console.error(e)
      alert('Erro ao carregar dados: ' + e.message)
    } finally { setLoading(false) }
  }

  async function adicionar(e) {
    e.preventDefault()
    const token = localStorage.getItem('access_token')
    const res = await fetch('/api/admin/parent-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ usuario_id: form.usuario_id, aluno_id: form.aluno_id })
    })
    if (!res.ok) return alert('Erro ao adicionar vínculo')
    alert('Vínculo adicionado')
    setForm({ usuario_id: '', aluno_id: '' })
    carregarDados()
  }

  async function remover(link) {
    if (!confirm('Remover vínculo?')) return
    const token = localStorage.getItem('access_token')
    const res = await fetch('/api/admin/parent-links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ usuario_id: link.usuario_id, aluno_id: link.aluno_id })
    })
    if (!res.ok) return alert('Erro ao remover vínculo')
    alert('Vínculo removido')
    carregarDados()
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2>Gerenciar vínculos pais & alunos</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: '0 0 360px' }}>
          <form onSubmit={adicionar} className="card">
            <div style={{ marginBottom: 8 }}>
              <label>Usuário (pai/mãe)</label>
              <select value={form.usuario_id} onChange={e => setForm({ ...form, usuario_id: e.target.value })} style={{ width: '100%' }}>
                <option value="">— selecione —</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome} — {u.email}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Aluno</label>
              <select value={form.aluno_id} onChange={e => setForm({ ...form, aluno_id: e.target.value })} style={{ width: '100%' }}>
                <option value="">— selecione —</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} — {a.matricula}</option>)}
              </select>
            </div>
            <div>
              <button className="btn btn-primary" type="submit">Adicionar vínculo</button>
            </div>
          </form>
        </div>

        <div style={{ flex: 1 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Vínculos existentes</h3>
            {loading && <div>Carregando...</div>}
            {!loading && links.length === 0 && <div style={{ padding: 12 }}>Nenhum vínculo cadastrado.</div>}
            {!loading && links.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>Usuário</th><th>Aluno</th><th>Matricula</th><th></th></tr>
                </thead>
                <tbody>
                  {links.map(l => (
                    <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td>{l.usuario_nome} ({l.usuario_id})</td>
                      <td>{l.aluno_nome}</td>
                      <td>{l.matricula}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn btn-ghost" onClick={() => remover(l)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
