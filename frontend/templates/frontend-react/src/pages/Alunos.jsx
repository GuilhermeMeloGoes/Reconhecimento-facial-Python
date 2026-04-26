import { useState } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'

export default function Alunos() {
  const { data: alunos = [], loading, error, refetch } = useApi('/api/alunos')
  const [editModal, setEditModal] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [editForm, setEditForm]   = useState({ nome: '', turma: '' })

  function abrirEditar(aluno) {
    setEditForm({ nome: aluno.nome, turma: aluno.turma || '' })
    setEditModal(aluno)
  }

  async function salvarEdicao() {
    if (!editForm.nome.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/alunos/${editModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: editForm.nome, turma: editForm.turma }),
      })
      setEditModal(null)
      refetch()
    } catch (e) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deletarAluno(id, nome) {
    if (!window.confirm(`Remover aluno ${nome}? Esta ação apagará também os registros de presença.`)) return
    try {
      await apiFetch(`/api/alunos/${id}`, { method: 'DELETE' })
      refetch()
    } catch (e) {
      alert('Erro ao remover: ' + e.message)
    }
  }

  function formatData(str) {
    if (!str || str === '—') return '—'
    return str.includes('T') ? str.split('.')[0].replace('T', ' ') : str
  }

  if (loading) return <p className="text-muted mono" style={{ fontSize: 12, padding: '16px 0' }}>Carregando alunos...</p>

  if (error) return (
    <div style={{ padding: 24, color: 'var(--danger)', fontFamily: 'var(--mono)' }}>
      <p>Erro ao carregar dados dos alunos.</p>
      <p style={{ fontSize: 11, marginTop: 8 }}>Detalhe: {error}</p>
      <button onClick={refetch} className="btn btn-ghost" style={{ marginTop: 12 }}>Tentar novamente</button>
    </div>
  )

  return (
    <>
      <div className="card">
        {alunos.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p className="text-muted mono" style={{ fontSize: 14, marginBottom: 12 }}>Nenhum aluno cadastrado no momento.</p>
            <a href="/cadastrar" className="btn btn-primary">Cadastre o primeiro aluno →</a>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>nome</th>
                <th>matrícula</th>
                <th>turma</th>
                <th>cadastrado em</th>
                <th style={{ textAlign: 'right' }}>ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map(a => (
                <tr key={a.id}>
                  <td className="mono text-muted" style={{ fontSize: 12 }}>{a.id}</td>
                  <td><strong>{a.nome}</strong></td>
                  <td className="mono">{a.matricula}</td>
                  <td className="mono">{a.turma || '—'}</td>
                  <td className="mono text-muted" style={{ fontSize: 12 }}>{formatData(a.cadastrado_em)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => abrirEditar(a)}
                        className="btn btn-ghost"
                        style={{ padding: '6px 10px', fontSize: 11 }}
                      >
                        editar
                      </button>
                      <button
                        onClick={() => deletarAluno(a.id, a.nome)}
                        className="btn btn-danger"
                        style={{ padding: '6px 10px', fontSize: 11 }}
                      >
                        remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editModal && (
        <>
          <div style={styles.dim} onClick={() => setEditModal(null)} />
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>editar aluno</h2>
            <p style={styles.modalSub}>ID #{editModal.id} · {editModal.matricula}</p>

            <div className="form-group">
              <label className="form-label">nome completo</label>
              <input
                className="form-input"
                value={editForm.nome}
                onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">turma</label>
              <input
                className="form-input"
                value={editForm.turma}
                onChange={e => setEditForm(f => ({ ...f, turma: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setEditModal(null)} className="btn btn-ghost">cancelar</button>
              <button onClick={salvarEdicao} className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" />salvando…</> : 'salvar'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

const styles = {
  dim: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 200,
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 28,
    zIndex: 201,
    minWidth: 360,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  modalTitle: {
    fontFamily: 'var(--mono)',
    fontSize: 14,
    color: 'var(--accent)',
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--muted)',
    marginBottom: 20,
  },
}