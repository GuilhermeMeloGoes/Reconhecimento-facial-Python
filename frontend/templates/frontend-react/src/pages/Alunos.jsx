import { useState } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'
import Modal from '../components/Modal'

export default function Alunos() {
  const { data: alunos = [], loading, error, refetch } = useApi('/api/alunos')
  const [editModal, setEditModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ nome: '', turma: '', matricula: '' })
  const [query, setQuery] = useState('')

  function formatData(v) {
    if (!v) return '—'
    try { return new Date(v).toLocaleString() } catch { return String(v) }
  }

  function abrirEditar(a) {
    setEditModal(a)
    setEditForm({ nome: a.nome || '', turma: a.turma || '', matricula: a.matricula || '' })
  }

  function abrirCriar() {
    setEditModal({ id: null, nome: '', turma: '', matricula: '' })
    setEditForm({ nome: '', turma: '', matricula: '' })
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
      if (editModal && editModal.id) {
        await apiFetch(`/api/alunos/${editModal.id}`, { method: 'PUT', body: JSON.stringify(editForm) })
      } else {
        await apiFetch('/api/alunos', { method: 'POST', body: JSON.stringify(editForm) })
      }
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

  const filtered = alunos.filter(a => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (a.nome || '').toLowerCase().includes(q) || String(a.matricula || '').toLowerCase().includes(q)
  })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="fade-in">
        <div>
          <h1 style={{ margin: 0 }}>Alunos</h1>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} cadastrado{alunos.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="Buscar por nome ou matrícula" value={query} onChange={e => setQuery(e.target.value)} style={{ minWidth: 220 }} />
          <button className="btn btn-primary" onClick={abrirCriar}>Adicionar</button>
        </div>
      </div>

      <div className="card fade-in">
        {filtered.length === 0 ? (
          <div style={s.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.5, marginBottom: 16 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Nenhum aluno encontrado.</p>
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
                    {filtered.map((a, i) => (
                      <tr key={a.id || i} className="fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.id || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={s.avatar}>{(a.nome||'').charAt(0).toUpperCase()}</div>
                            <strong style={{ color: 'var(--text-primary)' }}>{a.nome}</strong>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{a.matricula || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{a.turma || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{formatData(a.cadastrado_em)}</td>
                        <td>
                          <div className="table-actions">
                            <button onClick={() => abrirEditar(a)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>Editar</button>
                            <button onClick={() => deletarAluno(a.id, a.nome)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>Remover</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="alunos-cards-mobile">
              {filtered.map((a, i) => (
                <div key={a.id || i} className="fade-in" style={{ ...s.mobileCard, animationDelay: `${i * 40}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={s.avatar}>{(a.nome||'').charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{a.matricula || '—'} · {a.turma || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => abrirEditar(a)} className="btn btn-ghost" style={{ flex: '1 1 120px', padding: '8px', fontSize: '0.85rem' }}>Editar</button>
                    <button onClick={() => deletarAluno(a.id, a.nome)} className="btn btn-danger" style={{ flex: '1 1 120px', padding: '8px', fontSize: '0.85rem' }}>Remover</button>
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
            <h2>{editModal && editModal.id ? 'Editar aluno' : 'Adicionar aluno'}</h2>
            {editModal && editModal.id && <p>ID #{editModal.id} · {editModal.matricula}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Turma</label>
            <input className="form-input" value={editForm.turma} onChange={e => setEditForm(f => ({ ...f, turma: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Matrícula</label>
            <input className="form-input" value={editForm.matricula} onChange={e => setEditForm(f => ({ ...f, matricula: e.target.value }))} />
          </div>

          <div className="modal-actions">
            <button onClick={() => setEditModal(null)} className="btn btn-ghost">Cancelar</button>
            <button onClick={salvarEdicao} className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner" />Salvando…</> : 'Salvar'}</button>
          </div>
        </Modal>
      )}

      <style>{`
        .table-responsive { overflow: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 720px; }
        th, td { padding: 12px 8px; text-align: left; }
        .table-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .alunos-cards-mobile { display: none; }

        @media (max-width: 900px) {
          .alunos-table-desktop { display: none; }
          .alunos-cards-mobile { display: flex; flex-direction: column; gap: 10px; }
          table { min-width: 0; }
        }

        @media (max-width: 520px) {
          .alunos-toolbar input { min-width: 120px; }
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
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--gradient-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  mobileCard: {
    padding: 14,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
}
