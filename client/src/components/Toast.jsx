import { useState, useEffect, useCallback, createContext, useContext } from 'react'

// ── Toast Context ─────────────────────────────────────────────
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    error: (msg, duration) => addToast(msg, 'error', duration),
    success: (msg, duration) => addToast(msg, 'success', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// ── Toast Container ────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  )
}

// ── Single Toast Item ──────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.duration])

  useEffect(() => {
    if (exiting) {
      const exitTimer = setTimeout(onDismiss, 350)
      return () => clearTimeout(exitTimer)
    }
  }, [exiting, onDismiss])

  const icons = {
    error: '✕',
    success: '✓',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div
      className={`toast toast-${toast.type} ${exiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
    >
      <div className={`toast-icon toast-icon-${toast.type}`}>
        {icons[toast.type] || icons.info}
      </div>
      <p className="toast-message">{toast.message}</p>
      <button
        className="toast-close"
        onClick={() => setExiting(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export default ToastProvider
