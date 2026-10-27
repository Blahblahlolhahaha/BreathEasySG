// Pop-ups when a location goes over the limit or comes back under it; each closes after 8 seconds.
import { useEffect } from 'react'
import { CircleCheck, TriangleAlert, X } from 'lucide-react'

function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 8000)
    return () => clearTimeout(t)
  }, [toast.id, onClose])
  const Icon = toast.kind === 'clear' ? CircleCheck : TriangleAlert
  return (
    <div className={`toast toast-${toast.kind || 'over'}`}>
      <Icon size={18} aria-hidden="true" />
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

/**
 * Pop-up messages in the corner. Each toast is { id, kind: 'over' | 'clear', title, body } and closes itself after 8 seconds.
 * onClose must be stable (useCallback).
 */
export function Toasts({ toasts, onClose }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  )
}
