import { useState } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'
import Modal from '../components/Modal'

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

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3,4].map(i => (
        <div key={i} className="shimmer" style={{ height: 56, borderRadius: 'var(--radius-sm)' }} />
      ))}
    </div>
  )

  if (error) return (
    <div className="card fade-in" style={{ textAlign: 'center', padding: 40 }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.6 }}>
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <p style={{ color: 'var(--danger)', marginBottom: 8 }}>Erro ao carregar dados dos alunos.</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16 }}>Detalhe: {error}</p>
      <button onClick={refetch} className="btn btn-ghost">Tentar novamente</button>
    </div>
  )

  return (
    <>
      <div className="card fade-in">
        {alunos.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.5 }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Nenhum aluno cadastrado ainda.</p>
            <a href="/cadastrar" className="btn btn-primary">Cadastrar primeiro aluno</a>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="alunos-table-desktop">
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
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => abrirEditar(a)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.6875rem' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Editar
                          </button>
                          <button onClick={() => deletarAluno(a.id, a.nome)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.6875rem' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" />
                              <path d="M10 11v6" /><path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="alunos-cards-mobile">
              {alunos.map((a, i) => (
                <div key={a.id} className="fade-in" style={{ ...s.mobileCard, animationDelay: `${i * 40}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={s.avatar}>{a.nome.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{a.nome}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {a.matricula} · {a.turma || '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => abrirEditar(a)} className="btn btn-ghost" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}>
                      Editar
                    </button>
                    <button onClick={() => deletarAluno(a.id, a.nome)} className="btn btn-danger" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit modal */}
      {editModal && (
        <Modal onClose={() => setEditModal(null)}>
          <div className="modal-header">
            <h2>Editar aluno</h2>
            <p>ID #{editModal.id} · {editModal.matricula}</p>
          </div>

          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input
              className="form-input"
              value={editForm.nome}
              onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Turma</label>
            <input
              className="form-input"
              value={editForm.turma}
              onChange={e => setEditForm(f => ({ ...f, turma: e.target.value }))}
            />
          </div>

          <div className="modal-actions">
            <button onClick={() => setEditModal(null)} className="btn btn-ghost">Cancelar</button>
            <button onClick={salvarEdicao} className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" />Salvando…</> : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .alunos-cards-mobile { display: none; }

        @media (max-width: 768px) {
          .alunos-table-desktop { display: none; }
          .alunos-cards-mobile {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
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