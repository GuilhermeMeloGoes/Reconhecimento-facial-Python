import { useState, useEffect, useRef, useCallback } from 'react'

export default function Reconhecimento() {
  const [event, setEvent]     = useState(null)
  const [visible, setVisible] = useState(false)
  const timeoutRef            = useRef(null)

  const showModal = useCallback((ev) => {
    setEvent(ev)
    setVisible(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(false), 4000)
  }, [])

  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const r = await fetch('/api/events')
        const events = await r.json()
        if (active && events?.length > 0) {
          showModal(events[events.length - 1])
        }
      } catch {
        setVisible(false)
      }
      if (active) setTimeout(poll, 1000)
    }
    poll()
    return () => {
      active = false
      clearTimeout(timeoutRef.current)
    }
  }, [showModal])

  const hora = event
    ? new Date(event.timestamp).toLocaleTimeString('pt-BR')
    : ''

  return (
    <div style={styles.container}>
      <div style={styles.camWrap}>
        <div style={styles.overlay}>
          <div style={styles.recDot} />
          RECONHECIMENTO ATIVO (ENTRADA/SAÍDA)
        </div>
        <img
          src="/video_feed?tipo=auto"
          alt="Feed de Reconhecimento"
          style={styles.camImg}
        />
      </div>

      <div style={styles.statusCard}>
        <div style={styles.statusIcon}>○</div>
        <div>
          <div style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 4, fontFamily: 'var(--mono)' }}>
            SISTEMA INTELIGENTE
          </div>
          <div style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>
            Posicione-se em frente à câmera para registrar sua entrada ou saída.
          </div>
        </div>
      </div>

      {visible && <div style={styles.dim} onClick={() => setVisible(false)} />}

      <div style={{ ...styles.modal, ...(visible ? styles.modalShow : {}) }}>
        <div style={styles.modalIcon}>✓</div>
        <div style={styles.modalType}>
          {event ? (event.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA') + ' REGISTRADA' : ''}
        </div>
        <div style={styles.modalName}>{event?.nome ?? ''}</div>
        <div style={styles.modalTime}>{hora}</div>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 800, margin: '0 auto' },
  camWrap: {
    position: 'relative',
    background: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    border: '2px solid var(--border)',
    aspectRatio: '16/9',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  camImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  overlay: {
    position: 'absolute',
    top: 20, left: 20,
    fontFamily: 'var(--mono)',
    fontSize: 12,
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,0,0,0.4)',
    padding: '6px 12px',
    borderRadius: 4,
    backdropFilter: 'blur(4px)',
    zIndex: 1,
  },
  recDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: 'var(--danger)',
    animation: 'blink 1s step-end infinite',
  },
  statusCard: {
    marginTop: 24,
    padding: 20,
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    fontFamily: 'var(--mono)',
  },
  statusIcon: { fontSize: 24, color: 'var(--accent)' },
  dim: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.8)',
    zIndex: 999,
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%) scale(0.9)',
    background: 'var(--bg2)',
    border: '2px solid var(--accent)',
    padding: 30,
    borderRadius: 16,
    zIndex: 1000,
    textAlign: 'center',
    boxShadow: '0 0 100px rgba(0,255,157,0.3)',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: 300,
  },
  modalShow: {
    opacity: 1,
    transform: 'translate(-50%, -50%) scale(1)',
    pointerEvents: 'auto',
  },
  modalIcon: { fontSize: 48, marginBottom: 16, color: 'var(--accent)' },
  modalType: {
    textTransform: 'uppercase',
    fontFamily: 'var(--mono)',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 8,
    color: 'var(--muted)',
  },
  modalName: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  modalTime: { color: 'var(--muted)', fontSize: 14 },
}