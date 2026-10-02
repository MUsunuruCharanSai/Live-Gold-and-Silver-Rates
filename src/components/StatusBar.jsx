import { formatTime } from '../utils/format'

function StatusBar({ loading, refreshing, error, lastUpdated, secondsLeft, onRefresh }) {
  let statusLabel = 'Live'
  let statusClass = 'is-live'

  if (loading && !lastUpdated) {
    statusLabel = 'Loading'
    statusClass = 'is-loading'
  } else if (error && !lastUpdated) {
    statusLabel = 'Offline'
    statusClass = 'is-error'
  } else if (error) {
    statusLabel = 'Last known'
    statusClass = 'is-stale'
  } else if (refreshing) {
    statusLabel = 'Refreshing'
    statusClass = 'is-refreshing'
  }

  return (
    <section className="status-bar">
      <div className="status-left">
        <span className={`status-dot ${statusClass}`} />
        <strong>{statusLabel}</strong>
        <span className="status-sep">•</span>
        <span>Last updated {formatTime(lastUpdated)}</span>
      </div>

      <div className="status-right">
        {!error && lastUpdated && (
          <span className="countdown">Next refresh in {secondsLeft}s</span>
        )}
        <button type="button" className="ghost-btn" onClick={onRefresh} disabled={loading || refreshing}>
          {refreshing ? 'Updating…' : 'Refresh now'}
        </button>
      </div>
    </section>
  )
}

export default StatusBar
