// Shared loading, error and empty-state messages.
import { CloudOff, RefreshCw } from 'lucide-react'
import { formatTime } from '../lib/format'

/** Grey placeholder block shown while data loads. */
export function Skeleton({ height = 16, width = '100%', radius = 8, className = '' }) {
  return <span className={`skeleton ${className}`} style={{ height, width, borderRadius: radius }} aria-hidden="true" />
}

/** Shown when readings could not load and there is nothing older to fall back on. */
export function ErrorNotice({ onRetry }) {
  return (
    <div className="notice notice-error" role="alert">
      <CloudOff size={20} aria-hidden="true" />
      <div>
        <strong>Air quality data didn't load</strong>
        <p>The server may be busy or your connection may have dropped. Try again in a moment.</p>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
        <RefreshCw size={16} /> Try again
      </button>
    </div>
  )
}

/** Shown when a refresh failed but older readings are still on screen. */
export function StaleNotice({ updatedAt, onRetry }) {
  return (
    <div className="notice" role="status">
      <CloudOff size={18} aria-hidden="true" />
      <p>
        Live update failed. Showing readings from <strong>{formatTime(updatedAt)}</strong>.
      </p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-icon">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
