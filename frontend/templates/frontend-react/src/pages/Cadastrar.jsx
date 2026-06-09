import { useState, useRef, useEffect, useCallback } from 'react'

const INITIAL = { nome: '', matricula: '', turma: '' }

const STEPS = [
  { id: 'form',    label: 'Dados',      num: 1 },
  { id: 'camera',  label: 'Foto',       num: 2 },
  { id: 'preview', label: 'Confirmar',  num: 3 },
]

export default function Cadastrar() {
  const [form, setForm]              = useState(INITIAL)
  const [etapa, setEtapa]            = useState('form')
  const [fotoB64, setFotoB64]        = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [mensagem, setMensagem]      = useState('')
  const [permissao, setPermissao]    = useState(null)

  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)

  function campo(field) {
    return {
      value: form[field],
      onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    }
  }

  const abrirCamera = useCallback(async () => {
    setEtapa('camera')
    setPermissao(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setPermissao('ok')
    } catch (err) {
      console.error(err)
      setPermissao('negada')
      setEtapa('form')
    }
  }, [])

  const pararCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const tirarFoto = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const b64     = dataUrl.split(',')[1]
    setFotoPreview(dataUrl)
    setFotoB64(b64)
    pararCamera()
    setEtapa('preview')
  }, [pararCamera])

  const enviarCadastro = useCallback(async () => {
    setEtapa('enviando')
    setMensagem('Processando reconhecimento facial…')
    try {
      const res  = await fetch('/api/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, imagem_b64: fotoB64 }),
      })
      const data = await res.json()
      if (data.ok) {
        setMensagem(`${data.nome} cadastrado com sucesso!`)
        setEtapa('ok')
        setTimeout(() => {
          setForm(INITIAL)
          setFotoB64(null)
          setFotoPreview(null)
          setEtapa('form')
          setMensagem('')
        }, 3500)
      } else {
        setMensagem(data.erro || 'Erro desconhecido')
        setEtapa('erro')
      }
    } catch {
      setMensagem('Erro de comunicação com o servidor.')
      setEtapa('erro')
    }
  }, [form, fotoB64])

  useEffect(() => () => pararCamera(), [pararCamera])

  const stepIndex = etapa === 'form' || etapa === 'erro' ? 0 : etapa === 'camera' ? 1 : 2

  return (
    <div className="page-form-container">

      {/* Stepper */}
      <div style={s.stepper}>
        {STEPS.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{
              ...s.stepDot,
              background: i <= stepIndex ? 'var(--gradient-main)' : 'var(--bg-elevated)',
              borderColor: i <= stepIndex ? 'transparent' : 'var(--border)',
              color: i <= stepIndex ? '#fff' : 'var(--text-muted)',
              boxShadow: i === stepIndex ? '0 0 16px var(--accent-glow)' : 'none',
            }}>
              {i < stepIndex ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : step.num}
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: i === stepIndex ? 600 : 400,
              color: i <= stepIndex ? 'var(--text-primary)' : 'var(--text-muted)',
              marginLeft: 8,
              marginRight: 16,
            }}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: '0 0 24px',
                height: 2,
                background: i < stepIndex ? 'var(--accent)' : 'var(--border)',
                borderRadius: 2,
                marginRight: 16,
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div style={s.dicas} className="fade-in">
        <Dica icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB800" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        } texto="Boa iluminação" />
        <Dica icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D2FF" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
          </svg>
        } texto="Olhe para a câmera" />
        <Dica icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A29BFE" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        } texto="Câmera nos olhos" />
        <Dica icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4D6D" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        } texto="Sem óculos/máscara" />
      </div>

      {/* Permission error */}
      {permissao === 'negada' && (
        <div className="fade-in" style={s.erroBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Permissão de câmera negada. Verifique as configurações do navegador.
        </div>
      )}

      {/* STEP: FORM */}
      {(etapa === 'form' || etapa === 'erro') && (
        <div className="card fade-in">
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" type="text" placeholder="Ex: Maria Silva" autoComplete="off" {...campo('nome')} />
          </div>
          <div className="form-group">
            <label className="form-label">Matrícula</label>
            <input className="form-input" type="text" placeholder="Ex: 2024001" autoComplete="off" {...campo('matricula')} />
          </div>
          <div className="form-group">
            <label className="form-label">Turma</label>
            <input className="form-input" type="text" placeholder="Ex: ADS-2024" autoComplete="off" {...campo('turma')} />
          </div>

          {etapa === 'erro' && (
            <div style={{ ...s.erroBanner, marginBottom: 16 }}>{mensagem}</div>
          )}

          <button
            className="btn btn-primary"
            onClick={() => {
              if (!form.nome.trim() || !form.matricula.trim()) {
                alert('Preencha nome e matrícula!')
                return
              }
              abrirCamera()
            }}
            style={{ width: '100%', padding: '14px', fontSize: '0.9rem' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Abrir câmera e tirar foto
          </button>
        </div>
      )}

      {/* STEP: CAMERA */}
      {etapa === 'camera' && (
        <div className="card scale-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={s.cameraWrap}>
            {permissao === null && (
              <div style={s.cameraPlaceholder}>
                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3, marginBottom: 12 }} />
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Aguardando permissão de câmera…
                </div>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: permissao === 'ok' ? 'block' : 'none' }} />
            {permissao === 'ok' && (
              <div style={s.cameraOverlay}>
                <div style={s.faceGuide} />
              </div>
            )}
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => { pararCamera(); setEtapa('form') }} style={{ flex: 1 }}>
              ← Voltar
            </button>
            <button className="btn btn-primary" onClick={tirarFoto} disabled={permissao !== 'ok'} style={{ flex: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="13" r="4" />
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              </svg>
              Tirar foto
            </button>
          </div>
        </div>
      )}

      {/* STEP: PREVIEW */}
      {etapa === 'preview' && (
        <div className="card scale-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={s.cameraWrap}>
            <img src={fotoPreview} alt="Prévia" style={{ width: '100%', display: 'block' }} />
            <div style={{ ...s.cameraOverlay, alignItems: 'flex-start', padding: '14px 18px', justifyContent: 'flex-start' }}>
              <span style={{
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 500,
              }}>
                Confirme se o rosto está nítido
              </span>
            </div>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => { setFotoB64(null); setFotoPreview(null); abrirCamera() }} style={{ flex: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Repetir
            </button>
            <button className="btn btn-success" onClick={enviarCadastro} style={{ flex: 2 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirmar e cadastrar
            </button>
          </div>
        </div>
      )}

      {/* STEP: PROCESSING */}
      {etapa === 'enviando' && (
        <div className="card fade-in" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 24px' }}>
            <div className="spinner" style={{ width: 56, height: 56, borderWidth: 3, position: 'absolute', inset: 0 }} />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2" strokeLinecap="round"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
              <path d="M7 3H5a2 2 0 0 0-2 2v2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M17 21h2a2 2 0 0 0 2-2v-2" />
              <circle cx="12" cy="10" r="3" /><path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" />
            </svg>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 8, fontWeight: 500 }}>
            {mensagem}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Analisando o rosto, isso pode levar alguns segundos…
          </div>
        </div>
      )}

      {/* STEP: SUCCESS */}
      {etapa === 'ok' && (
        <div className="card scale-in" style={{ textAlign: 'center', padding: '56px 24px', border: '1px solid rgba(0,229,160,0.15)' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--success-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>
            {mensagem}
          </div>
          {fotoPreview && (
            <img src={fotoPreview} alt="Foto cadastrada"
              style={{
                width: 80, height: 80, objectFit: 'cover',
                borderRadius: '50%', marginTop: 16,
                border: '3px solid var(--success)',
                boxShadow: '0 0 20px var(--success-glow)',
              }}
            />
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

/* ── Tip component ──────────────────────────────────────────────────────── */
function Dica({ icon, texto }) {
  return (
    <div style={s.dica}>
      {icon}
      <span>{texto}</span>
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  stepper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 0,
    flexWrap: 'wrap',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.3s',
    flexShrink: 0,
  },
  dicas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginBottom: 20,
    padding: '14px 16px',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
  },
  dica: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-sans)',
  },
  cameraWrap: {
    position: 'relative',
    background: '#000',
    minHeight: 260,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  faceGuide: {
    width: 160,
    height: 200,
    borderRadius: '50%',
    border: '2px dashed rgba(108,92,231,0.5)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35), 0 0 30px rgba(108,92,231,0.15) inset',
    animation: 'pulse 2.5s ease infinite',
  },
  erroBanner: {
    marginBottom: 16,
    padding: '12px 16px',
    background: 'var(--danger-bg)',
    border: '1px solid rgba(255,77,109,0.20)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)',
    fontSize: '0.8125rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
}
