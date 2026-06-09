import { useState } from 'react'
import { useApi, apiFetch } from '../hooks/useApi'
import Modal from '../components/Modal'

export default function GerenciarUsuarios() {
  const { data: usuarios = [], loading, error, refetch } = useApi('/api/auth/usuarios')
  const { data: alunos = [] } = useApi('/api/alunos')
  const [modal, setModal]       = useState(null) // 'criar' | 'editar' | 'reset'
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState({ nome: '', email: '', senha: '', perfil: 'aluno', aluno_id: '' })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  function abrirCriar() {
    setForm({ nome: '', email: '', senha: '', perfil: 'aluno', aluno_id: '' })
    setModal('criar')
    setMsg('')
  }

  function abrirEditar(u) {
    setSelected(u)
    setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil, aluno_id: u.aluno_id || '' })
    setModal('editar')
    setMsg('')
  }

  function abrirReset(u) {
    setSelected(u)
    setForm({ ...form, senha: '' })
    setModal('reset')
    setMsg('')
  }

  async function salvarCriar() {
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      setMsg('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    try {
      await apiFetch('/api/auth/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          perfil: form.perfil,
          aluno_id: form.aluno_id ? parseInt(form.aluno_id) : null,
        }),
      })
      setModal(null)
      refetch()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function salvarEditar() {
    if (!form.nome.trim()) { setMsg('Nome é obrigatório'); return }
    setSaving(true)
    try {
      await apiFetch(`/api/auth/usuarios/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: form.nome,
          perfil: form.perfil,
          aluno_id: form.aluno_id ? parseInt(form.aluno_id) : null,
        }),
      })
      setModal(null)
      refetch()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function salvarReset() {
    if (!form.senha.trim()) { setMsg('Nova senha é obrigatória'); return }
    setSaving(true)
    try {
      await apiFetch(`/api/auth/usuarios/${selected.id}/reset-senha`, {
        method: 'POST',
        body: JSON.stringify({ nova_senha: form.senha }),
      })
      setModal(null)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(u) {
    try {
      await apiFetch(`/api/auth/usuarios/${u.id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ ativo: !u.ativo }),
      })
      refetch()
    } catch (e) {
      alert(e.message)
    }
  }

  async function deletar(u) {
    if (!window.confirm(`Remover o usuário "${u.nome}"?`)) return
    try {
      await apiFetch(`/api/auth/usuarios/${u.id}`, { method: 'DELETE' })
      refetch()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 56, borderRadius: 8 }} />)}
    </div>
  )

  if (error) return (
    <div className="card fade-in" style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16 }}>Erro ao carregar usuários: {error}</p>
      <button onClick={refetch} className="btn btn-ghost">Tentar novamente</button>
    </div>
  )

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="fade-in">
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={abrirCriar} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo usuário
        </button>
      </div>

      {/* Table / Card list */}
      <div className="card fade-in">
        {usuarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.5, marginBottom: 16 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Nenhum usuário cadastrado.</p>
            <button onClick={abrirCriar} className="btn btn-primary">Criar primeiro usuário</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="usuarios-table-desktop">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Email</th>
                      <th>Perfil</th>
                      <th>Aluno vinculado</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u, i) => (
                      <tr key={u.id} className="fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              ...styles.avatar,
                              background: u.perfil === 'admin' ? 'var(--gradient-main)' : 'linear-gradient(135deg, #00E5A0, #00D2FF)',
                            }}>
                              {u.nome.charAt(0).toUpperCase()}
                            </div>
                            <strong style={{ color: 'var(--text-primary)' }}>{u.nome}</strong>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{u.email}</td>
                        <td>
                          <span style={{
                            ...styles.perfilTag,
                            background: u.perfil === 'admin' ? 'rgba(108,92,231,0.12)' : 'rgba(0,229,160,0.12)',
                            color: u.perfil === 'admin' ? 'var(--accent-light)' : 'var(--success)',
                            borderColor: u.perfil === 'admin' ? 'rgba(108,92,231,0.2)' : 'rgba(0,229,160,0.2)',
                          }}>
                            {u.perfil}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {u.aluno_nome ? `${u.aluno_nome} (${u.aluno_matricula})` : '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => toggleAtivo(u)}
                            style={{
                              ...styles.statusBtn,
                              background: u.ativo ? 'var(--success-bg)' : 'var(--danger-bg)',
                              color: u.ativo ? 'var(--success)' : 'var(--danger)',
                              borderColor: u.ativo ? 'rgba(0,229,160,0.2)' : 'rgba(255,77,109,0.2)',
                            }}
                          >
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: u.ativo ? 'var(--success)' : 'var(--danger)',
                              display: 'inline-block', marginRight: 4,
                            }} />
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => abrirEditar(u)} className="btn btn-ghost" style={styles.actionBtn}>Editar</button>
                            <button onClick={() => abrirReset(u)} className="btn btn-ghost" style={styles.actionBtn}>Senha</button>
                            <button onClick={() => deletar(u)} className="btn btn-danger" style={styles.actionBtn}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile card list */}
            <div className="usuarios-cards-mobile">
              {usuarios.map((u, i) => (
                <div key={u.id} className="fade-in" style={{ ...styles.mobileCard, animationDelay: `${i * 40}ms` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      ...styles.avatar,
                      background: u.perfil === 'admin' ? 'var(--gradient-main)' : 'linear-gradient(135deg, #00E5A0, #00D2FF)',
                    }}>
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{u.nome}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </div>
                    </div>
                    <span style={{
                      ...styles.perfilTag,
                      background: u.perfil === 'admin' ? 'rgba(108,92,231,0.12)' : 'rgba(0,229,160,0.12)',
                      color: u.perfil === 'admin' ? 'var(--accent-light)' : 'var(--success)',
                      borderColor: u.perfil === 'admin' ? 'rgba(108,92,231,0.2)' : 'rgba(0,229,160,0.2)',
                    }}>
                      {u.perfil}
                    </span>
                  </div>

                  {u.aluno_nome && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 10, padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      👤 {u.aluno_nome} ({u.aluno_matricula})
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => toggleAtivo(u)}
                      style={{
                        ...styles.statusBtn,
                        background: u.ativo ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: u.ativo ? 'var(--success)' : 'var(--danger)',
                        borderColor: u.ativo ? 'rgba(0,229,160,0.2)' : 'rgba(255,77,109,0.2)',
                        fontSize: '0.65rem',
                      }}
                    >
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: u.ativo ? 'var(--success)' : 'var(--danger)',
                        display: 'inline-block', marginRight: 3,
                      }} />
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => abrirEditar(u)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.7rem' }}>Editar</button>
                    <button onClick={() => abrirReset(u)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.7rem' }}>Senha</button>
                    <button onClick={() => deletar(u)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.7rem' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        .usuarios-cards-mobile { display: none; }

        @media (max-width: 768px) {
          .usuarios-table-desktop { display: none; }
          .usuarios-cards-mobile {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>

      {/* Modal */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <div className="modal-header">
            <h2>
              {modal === 'criar' ? 'Novo Usuário' : modal === 'editar' ? 'Editar Usuário' : 'Resetar Senha'}
            </h2>
          </div>

          {msg && <div className="modal-error">{msg}</div>}

          {(modal === 'criar' || modal === 'editar') && (
            <>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
              </div>
              {modal === 'criar' && (
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              )}
              {modal === 'criar' && (
                <div className="form-group">
                  <label className="form-label">Senha</label>
                  <input className="form-input" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Perfil</label>
                <select className="form-input" value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="aluno">Aluno / Pais</option>
                </select>
              </div>
              {form.perfil === 'aluno' && (
                <div className="form-group">
                  <label className="form-label">Vincular a aluno</label>
                  <select className="form-input" value={form.aluno_id} onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value }))}>
                    <option value="">— Selecionar —</option>
                    {alunos.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} ({a.matricula})</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {modal === 'reset' && (
            <div className="form-group">
              <label className="form-label">Nova senha para {selected?.nome}</label>
              <input className="form-input" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} autoFocus />
            </div>
          )}

          <div className="modal-actions">
            <button onClick={() => setModal(null)} className="btn btn-ghost">Cancelar</button>
            <button
              onClick={modal === 'criar' ? salvarCriar : modal === 'editar' ? salvarEditar : salvarReset}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? <><span className="spinner" />Salvando…</> : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

const styles = {
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#fff',
    flexShrink: 0,
  },
  perfilTag: {
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
    borderRadius: 'var(--radius-full)', fontSize: '0.6875rem',
    fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid',
  },
  statusBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
    borderRadius: 'var(--radius-full)', fontSize: '0.6875rem',
    fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid',
    cursor: 'pointer', background: 'transparent', transition: 'all 0.2s',
  },
  actionBtn: { padding: '6px 10px', fontSize: '0.6875rem' },
  mobileCard: {
    padding: 16,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
}
