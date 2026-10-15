// Pop-up warnings that appear when a location goes over the limit, and close after 8 seconds.
import { useEffect } from 'react'
import { TriangleAlert, X } from 'lucide-react'

function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 8000)
    return () => clearTimeout(t)
  }, [toast.id, onClose])
  return (
    <div className="toast">
      <TriangleAlert size={18} aria-hidden="true" />
      <div>
        <strong>{toast.title}</strong>
        <span>{toast.body}</span>
      </div>
      <button type="button" className="icon-btn" onClick={() => onClose(toast.id)} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  )
}

/** Pop-up messages in the corner. Each closes itself after 8 seconds. onClose must be stable (useCallback). */
export function Toasts({ toasts, onClose }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  )
}
