import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ children, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose()
    }
    document.addEventListener('keydown', onKey)

    // lock scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="modal-overlay" onClick={() => onClose && onClose()}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}
