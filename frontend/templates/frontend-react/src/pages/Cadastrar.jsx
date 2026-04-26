import { useState, useRef } from 'react'

const INITIAL = { nome: '', matricula: '', turma: '' }

export default function Cadastrar() {
  const [form, setForm]         = useState(INITIAL)
  const [capturando, setCapt]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus]     = useState('')
  const [showFeedback, setShow] = useState(false)
  const intervalRef             = useRef(null)

  function campo(field) {
    return {
      value: form[field],
      onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    }
  }

  async function iniciarCadastro() {
    if (capturando) return
    if (!form.nome.trim() || !form.matricula.trim()) {
      alert('Preencha nome e matrícula!')
      return
    }

    setCapt(true)
    setShow(true)
    setProgress(0)
    setStatus('Olhe para a câmera… capturando 50 frames')

    intervalRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 2, 95))
    }, 100)

    try {
      const res = await fetch('/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      clearInterval(intervalRef.current)
      setProgress(100)

      if (data.ok) {
        setStatus(`✓ ${data.nome} cadastrado com sucesso! ID: ${data.aluno_id}`)
        setTimeout(() => {
          setForm(INITIAL)
          setProgress(0)
          setShow(false)
          setStatus('')
        }, 3000)
      } else {
        setStatus('✗ Erro: ' + data.erro)
      }
    } catch {
      clearInterval(intervalRef.current)
      setStatus('✗ Erro de comunicação com o servidor')
    }

    setCapt(false)
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="text-muted mb-6" style={{ fontSize: 13, lineHeight: 1.6 }}>
        Preencha os dados do aluno e clique em{' '}
        <strong style={{ color: 'var(--text)' }}>Capturar</strong>.
        O sistema irá gravar ~5 segundos de vídeo, coletar 50 frames e salvar{' '}
        <strong style={{ color: 'var(--accent)' }}>1 vetor médio</strong> de 128 dimensões.
      </p>

      <div className="card">
        <div className="form-group">
          <label className="form-label">nome completo</label>
          <input className="form-input" type="text" placeholder="Ex: Maria Silva" autoComplete="off" {...campo('nome')} />
        </div>
        <div className="form-group">
          <label className="form-label">matrícula</label>
          <input className="form-input" type="text" placeholder="Ex: 2024001" autoComplete="off" {...campo('matricula')} />
        </div>
        <div className="form-group">
          <label className="form-label">turma</label>
          <input className="form-input" type="text" placeholder="Ex: ADS-2024" autoComplete="off" {...campo('turma')} />
        </div>

        <button
          className="btn btn-primary"
          onClick={iniciarCadastro}
          disabled={capturando}
        >
          {capturando
            ? <><span className="spinner" />Capturando…</>
            : <>◉ &nbsp;Capturar rosto</>
          }
        </button>

        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>

        {showFeedback && (
          <div style={styles.feedback}>
            {capturando && <span className="spinner" />}
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12 }}>
              {status}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  progressBar: {
    height: 3,
    background: 'var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 24,
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent)',
    transition: 'width .3s',
  },
  feedback: {
    marginTop: 20,
    padding: '16px 20px',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
  },
}