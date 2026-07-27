import './States.css'

export function LoadingState() {
  return (
    <div className="state">
      <div className="state-spinner" />
      <p className="state-text">Loading weather…</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state">
      <div className="state-emoji">🌧️</div>
      <p className="state-text">{message}</p>
      <button className="state-btn glass" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function InlineSkeleton({ height = 120 }: { height?: number }) {
  return <div className="skeleton glass" style={{ height }} />
}
