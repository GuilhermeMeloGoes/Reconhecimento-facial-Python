import { useState } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'
import Modal from '../components/Modal'

export default function Alunos() {
  const { data: alunos = [], loading, error, refetch } = useApi('/api/alunos')
  const [editModal, setEditModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ nome: '', turma: '' })

  function formatData(v) {
    if (!v) return '—'
    try { return new Date(v).toLocaleString() } catch { return String(v) }
  }

  function abrirEditar(a) {
    setEditModal(a)
    setEditForm({ nome: a.nome || '', turma: a.turma || '' })
  }

  async function deletarAluno(id, nome) {
    if (!window.confirm(`Remover o aluno "${nome}"?`)) return
    try {
      await apiFetch(`/api/alunos/${id}`, { method: 'DELETE' })
      refetch()
    } catch (e) { alert(e.message) }
  }

  async function salvarEdicao() {
    if (!editForm.nome.trim()) return alert('Nome é obrigatório')
    setSaving(true)
    try {
      await apiFetch(`/api/alunos/${editModal.id}`, { method: 'PUT', body: JSON.stringify(editForm) })
      setEditModal(null)
      refetch()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 56, borderRadius: 8 }} />)}
    </div>
  )

  if (error) return (
    <div className="card fade-in" style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16 }}>Erro ao carregar alunos: {error}</p>
      <button onClick={refetch} className="btn btn-ghost">Tentar novamente</button>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="fade-in">
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} cadastrado{alunos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="card fade-in">
        {alunos.length === 0 ? (
          <div style={s.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.5, marginBottom: 16 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Nenhum aluno cadastrado.</p>
          </div>
        ) : (
          <>
            <div className="alunos-table-desktop">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>#</th>
                      <th>Nome</th>
                      <th>Matrícula</th>
                      <th>Turma</th>
                      <th>Cadastrado em</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((a, i) => (
                      <tr key={a.id} className="fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.id}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={s.avatar}>{a.nome.charAt(0).toUpperCase()}</div>
                            <strong style={{ color: 'var(--text-primary)' }}>{a.nome}</strong>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{a.matricula}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{a.turma || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{formatData(a.cadastrado_em)}</td>
                        <td>
                          <div className="table-actions">
                            <button onClick={() => abrirEditar(a)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.6875rem' }}>Editar</button>
                            <button onClick={() => deletarAluno(a.id, a.nome)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.6875rem' }}>Remover</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="alunos-cards-mobile">
              {alunos.map((a, i) => (
                <div key={a.id} className="fade-in" style={{ ...s.mobileCard, animationDelay: `${i * 40}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={s.avatar}>{a.nome.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{a.nome}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.matricula} · {a.turma || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => abrirEditar(a)} className="btn btn-ghost" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}>Editar</button>
                    <button onClick={() => deletarAluno(a.id, a.nome)} className="btn btn-danger" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editModal && (
        <Modal onClose={() => setEditModal(null)}>
          <div className="modal-header">
            <h2>Editar aluno</h2>
            <p>ID #{editModal.id} · {editModal.matricula}</p>
          </div>

          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Turma</label>
            <input className="form-input" value={editForm.turma} onChange={e => setEditForm(f => ({ ...f, turma: e.target.value }))} />
          </div>

          <div className="modal-actions">
            <button onClick={() => setEditModal(null)} className="btn btn-ghost">Cancelar</button>
            <button onClick={salvarEdicao} className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner" />Salvando…</> : 'Salvar'}</button>
          </div>
        </Modal>
      )}

      <style>{`
        .alunos-cards-mobile { display: none; }

        @media (max-width: 768px) {
          .alunos-table-desktop { display: none; }
          .alunos-cards-mobile { display: flex; flex-direction: column; gap: 10px; }
        }
      `}</style>
    </>
  )
}

const s = {
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--gradient-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  mobileCard: {
    padding: 16,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
}
