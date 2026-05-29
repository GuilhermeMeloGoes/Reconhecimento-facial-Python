import { useState, useEffect, useRef, useCallback } from 'react'

const MODOS = {
  entrada: { label: 'ENTRADA', cor: '#00E5A0', corBg: 'rgba(0,229,160,0.08)', gradient: 'linear-gradient(135deg, #00E5A0, #00D2FF)' },
  saida:   { label: 'SAÍDA',   cor: '#FF4D6D', corBg: 'rgba(255,77,109,0.08)', gradient: 'linear-gradient(135deg, #FF4D6D, #F093FB)' },
  idle:    { label: null,      cor: 'var(--border)', corBg: 'transparent', gradient: 'none' },
}

const HORA_INICIO = 7
const HORA_FIM    = 17

function dentroDoHorario() {
  const h = new Date().getHours()
  return h >= HORA_INICIO && h < HORA_FIM
}

export default function Reconhecimento() {
  const [modo, setModo]               = useState('idle')
  const [ativo, setAtivo]             = useState(false)
  const [event, setEvent]             = useState(null)
  const [visible, setVisible]         = useState(false)
  const [ultimoErro, setUltimoErro]   = useState(null)
  const [permissao, setPermissao]     = useState(null)
  const [processando, setProcessando] = useState(false)
  const [countdown, setCountdown]     = useState(0)
  const [ultimoAluno, setUltimoAluno] = useState(null)

  const videoRef       = useRef(null)
  const canvasRef      = useRef(null)
  const streamRef      = useRef(null)
  const intervalRef    = useRef(null)
  const timeoutRef     = useRef(null)
  const countdownRef   = useRef(null)
  const ativoRef       = useRef(false)
  const modoRef        = useRef('idle')

  useEffect(() => { ativoRef.current = ativo }, [ativo])
  useEffect(() => { modoRef.current = modo }, [modo])

  const pararCamera = useCallback(() => {
    clearInterval(intervalRef.current)
    clearInterval(countdownRef.current)
    clearTimeout(timeoutRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setAtivo(false)
    setModo('idle')
    setCountdown(0)
    setProcessando(false)
  }, [])

  const iniciarCamera = useCallback(async (tipoModo) => {
    setUltimoErro(null)
    setPermissao(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      setPermissao('ok')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setModo(tipoModo)
      setAtivo(true)
      setCountdown(60)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { pararCamera(); return 0 }
          return prev - 1
        })
      }, 1000)
      intervalRef.current = setInterval(() => {
        capturarEEnviar(tipoModo)
      }, 1200)
    } catch (err) {
      console.error('[Câmera]', err)
      setPermissao('negada')
      setUltimoErro('Permissão de câmera negada. Verifique as configurações do navegador.')
    }
  }, [pararCamera])

  const capturarEEnviar = useCallback(async (tipoModo) => {
    if (!ativoRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    canvas.width  = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    const b64     = dataUrl.split(',')[1]
    setProcessando(true)
    try {
      const res = await fetch('/api/reconhecer_frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagem_b64: b64, tipo: modoRef.current === 'idle' ? null : modoRef.current }),
      })
      const data = await res.json()
      if (!ativoRef.current) return
      if (data.ok && data.reconhecido && data.registrado) {
        setEvent({
          nome: data.aluno?.nome, tipo: data.tipo, turma: data.aluno?.turma,
          timestamp: data.timestamp, confianca: data.confianca,
        })
        setUltimoAluno(data.aluno)
        setVisible(true)
        setUltimoErro(null)
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setVisible(false), 5000)
        setTimeout(() => { if (ativoRef.current) pararCamera() }, 2000)
      } else if (data.ok && data.reconhecido && !data.registrado) {
        if (data.fora_horario) {
          setUltimoErro(`Fora do horário permitido (${HORA_INICIO}h–${HORA_FIM}h)`)
        } else if (data.mensagem) {
          setUltimoErro(data.mensagem)
        }
        setUltimoAluno(data.aluno || null)
      }
    } catch (err) {
      if (ativoRef.current) setUltimoErro('Erro de comunicação com o servidor.')
    } finally {
      if (ativoRef.current) setProcessando(false)
    }
  }, [pararCamera])

  const selecionarModo = useCallback(async (tipo) => {
    if (ativo) {
      if (modo === tipo) { pararCamera(); return }
      setModo(tipo)
      return
    }
    await iniciarCamera(tipo)
  }, [ativo, modo, pararCamera, iniciarCamera])

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
      clearTimeout(timeoutRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const fora = !dentroDoHorario()
  const m = MODOS[modo]
  const hora = event?.timestamp
    ? new Date(event.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>

      {/* Warning: outside hours */}
      {fora && (
        <div className="fade-in" style={s.avisoHorario}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Fora do horário de aula ({HORA_INICIO}h–{HORA_FIM}h). Registros bloqueados.
        </div>
      )}

      {/* Permission error */}
      {permissao === 'negada' && (
        <div className="fade-in" style={s.erroBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {ultimoErro || 'Permissão de câmera negada.'}
        </div>
      )}

      {/* Mode buttons */}
      <div style={s.btnRow}>
        <ModoButton
          label="ENTRADA"
          ativo={ativo && modo === 'entrada'}
          cor="#00E5A0"
          gradient="linear-gradient(135deg, #00E5A0, #00D2FF)"
          disabled={fora}
          onClick={() => selecionarModo('entrada')}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
              <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
            </svg>
          }
        />
        <ModoButton
          label="SAÍDA"
          ativo={ativo && modo === 'saida'}
          cor="#FF4D6D"
          gradient="linear-gradient(135deg, #FF4D6D, #F093FB)"
          disabled={fora}
          onClick={() => selecionarModo('saida')}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          }
        />
      </div>

      {/* Camera area */}
      <div style={{
        ...s.camWrap,
        borderColor: ativo ? m.cor : 'rgba(255,255,255,0.06)',
        boxShadow: ativo ? `0 0 40px ${m.cor}20` : 'none',
      }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ ...s.camVideo, display: ativo ? 'block' : 'none' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Placeholder */}
        {!ativo && (
          <div style={s.camPlaceholder}>
            <div style={s.camPlaceholderIcon}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.3 }}>
                <path d="M7 3H5a2 2 0 0 0-2 2v2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M17 21h2a2 2 0 0 0 2-2v-2" />
                <circle cx="12" cy="10" r="3" /><path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" />
              </svg>
            </div>
            <div style={s.camPlaceholderText}>
              Selecione <strong>ENTRADA</strong> ou <strong>SAÍDA</strong><br />
              para ativar a câmera
            </div>
          </div>
        )}

        {/* Active overlay */}
        {ativo && (
          <>
            <div style={s.overlay}>
              <span style={{ ...s.recDot, background: m.cor }} />
              <span style={{ color: m.cor, fontSize: '0.6875rem', fontWeight: 600 }}>{m.label}</span>
              {processando && (
                <span className="spinner" style={{ width: 12, height: 12, marginRight: 0, borderTopColor: m.cor }} />
              )}
              <span style={s.countdownBadge}>{countdown}s</span>
            </div>
            {/* Scan line */}
            <div style={s.scanLine} />
          </>
        )}

        {/* Last recognized */}
        {ativo && ultimoAluno && !visible && (
          <div style={s.overlayAluno}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E5A0" strokeWidth="3" strokeLinecap="round" style={{ marginRight: 6 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {ultimoAluno.nome}
          </div>
        )}
      </div>

      {/* Status card */}
      {ativo && (
        <div className="fade-in" style={{ ...s.statusCard, borderColor: m.cor + '30', background: m.corBg }}>
          <span style={{ ...s.recDot, background: m.cor, width: 10, height: 10 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: m.cor }}>
            Câmera ativa — modo {m.label}
          </span>
          <button onClick={pararCamera} className="btn btn-danger" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '0.6875rem' }}>
            Parar
          </button>
        </div>
      )}

      {/* Error banner */}
      {ultimoErro && permissao !== 'negada' && (
        <div className="fade-in" style={s.erroBanner}>{ultimoErro}</div>
      )}

      {/* Modal backdrop */}
      {visible && <div style={s.dim} onClick={() => setVisible(false)} />}

      {/* Success modal */}
      <div style={{ ...s.modal, ...(visible ? s.modalShow : {}) }}>
        <div style={{
          ...s.modalIconWrap,
          background: event?.tipo === 'entrada' ? 'rgba(0,229,160,0.12)' : 'rgba(255,77,109,0.12)',
          color: event?.tipo === 'entrada' ? '#00E5A0' : '#FF4D6D',
        }}>
          {event?.tipo === 'entrada' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
              <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          )}
        </div>
        <div style={s.modalType}>
          {event ? (event.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA') + ' REGISTRADA' : ''}
        </div>
        <div style={s.modalName}>{event?.nome ?? ''}</div>
        {event?.turma && <div style={s.modalMeta}>Turma: {event.turma}</div>}
        {event?.confianca && <div style={s.modalMeta}>Confiança: {event.confianca}%</div>}
        <div style={s.modalTime}>{hora}</div>
        <button onClick={() => setVisible(false)} className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }}>
          Fechar
        </button>
      </div>

      <style>{`
        @keyframes scanMove {
          0%   { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  )
}

/* ── Mode Button ────────────────────────────────────────────────────────── */
function ModoButton({ label, ativo, cor, gradient, onClick, icon, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '18px 24px',
        border: `2px solid ${ativo ? cor : disabled ? 'var(--border)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 'var(--radius-md)',
        background: ativo ? `${cor}12` : 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        color: ativo ? cor : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.875rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        transition: 'all 0.25s var(--ease-out)',
        boxShadow: ativo ? `0 4px 25px ${cor}25` : 'none',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon}
      {label}
      {ativo && (
        <span style={{
          fontSize: '0.625rem',
          marginLeft: 4,
          padding: '2px 8px',
          background: `${cor}20`,
          borderRadius: 'var(--radius-full)',
          animation: 'pulse 1.5s ease infinite',
        }}>
          ● ATIVO
        </span>
      )}
    </button>
  )
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  avisoHorario: {
    marginBottom: 16,
    padding: '14px 18px',
    background: 'var(--warning-bg)',
    border: '1px solid rgba(255,184,0,0.20)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--warning)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.8125rem',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
  },
  camWrap: {
    position: 'relative',
    background: '#000',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '2px solid',
    aspectRatio: '4/3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  },
  camVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  camPlaceholder: {
    textAlign: 'center',
    padding: 40,
    color: 'var(--text-muted)',
  },
  camPlaceholderIcon: { marginBottom: 16 },
  camPlaceholderText: { fontSize: '0.875rem', lineHeight: 1.7, fontFamily: 'var(--font-sans)' },
  overlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,0,0,0.70)',
    padding: '6px 14px',
    borderRadius: 'var(--radius-full)',
    backdropFilter: 'blur(8px)',
    zIndex: 1,
    letterSpacing: '0.04em',
  },
  overlayAluno: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    background: 'rgba(0,0,0,0.80)',
    backdropFilter: 'blur(8px)',
    padding: '8px 20px',
    borderRadius: 'var(--radius-full)',
    color: '#F0F2F8',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  recDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    animation: 'blink 1s step-end infinite',
    flexShrink: 0,
  },
  countdownBadge: {
    background: 'rgba(255,255,255,0.1)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.625rem',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    background: 'linear-gradient(90deg, transparent, rgba(108,92,231,0.5), transparent)',
    animation: 'scanMove 2.5s ease-in-out infinite',
    zIndex: 1,
    pointerEvents: 'none',
  },
  statusCard: {
    marginTop: 16,
    padding: '14px 20px',
    border: '1px solid',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    backdropFilter: 'blur(8px)',
    transition: 'all 0.3s',
  },
  erroBanner: {
    marginTop: 12,
    padding: '12px 16px',
    background: 'var(--danger-bg)',
    border: '1px solid rgba(255,77,109,0.20)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.8125rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.80)',
    backdropFilter: 'blur(6px)',
    zIndex: 999,
    animation: 'fadeIn 0.25s ease',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) scale(0.88)',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(24px)',
    border: '1px solid var(--glass-border)',
    padding: '40px 36px 32px',
    borderRadius: 'var(--radius-xl)',
    zIndex: 1000,
    textAlign: 'center',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    width: 'min(380px, calc(100vw - 48px))',
  },
  modalShow: {
    opacity: 1,
    transform: 'translate(-50%, -50%) scale(1)',
    pointerEvents: 'auto',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  modalType: {
    textTransform: 'uppercase',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    marginBottom: 8,
    color: 'var(--text-muted)',
  },
  modalName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: 6,
    color: 'var(--text-primary)',
  },
  modalMeta: { color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 4 },
  modalTime: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    marginBottom: 16,
    fontFamily: 'var(--font-mono)',
  },
}
