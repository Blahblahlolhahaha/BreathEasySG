// Small line under page titles showing when the readings were last updated, with a refresh button.
import { RefreshCw } from 'lucide-react'
import { useReadings } from '../data/ReadingsContext'
import { formatTime } from '../lib/format'
import { MockScenarioPicker } from './MockScenarioPicker'

/** "Updated 4:00 PM · NEA via data.gov.sg" with a refresh button and a placeholder-data badge. */
export function DataMeta({ showPicker = false }) {
  const { data, loading, refresh } = useReadings()
  return (
    <div className="data-meta">
      <span>
        {data ? <>Updated {formatTime(data.updatedAt)}</> : 'Loading readings…'} · Source: NEA via data.gov.sg
      </span>
      {data?.isPlaceholder && <span className="pill pill-muted">Placeholder data</span>}
      {showPicker && <MockScenarioPicker />}
      <button type="button" className="icon-btn" onClick={refresh} aria-label="Refresh readings" title="Refresh readings">
        <RefreshCw size={16} className={loading ? 'spin' : ''} />
      </button>
    </div>
  )
}
