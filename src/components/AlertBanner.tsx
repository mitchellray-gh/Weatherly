import type { WeatherAlert } from '../lib/alerts'
import './AlertBanner.css'

interface Props {
  alerts: WeatherAlert[]
}

/** A continuous stock-ticker style banner across the very top of the app.
 *  All active alerts scroll by so nothing is ever truncated. */
export function AlertBanner({ alerts }: Props) {
  if (alerts.length === 0) return null

  // Highest severity present drives the banner tint.
  const rank = { severe: 3, warning: 2, info: 1 } as const
  const level = alerts.reduce<WeatherAlert['level']>(
    (max, a) => (rank[a.level] > rank[max] ? a.level : max),
    'info',
  )

  const run = (
    <>
      {alerts.map((a) => (
        <span className="ticker-item" key={a.id}>
          <span className="ticker-icon">{a.icon}</span>
          <strong>{a.title}</strong>
          <span className="ticker-detail">{a.detail}</span>
          <span className="ticker-sep" aria-hidden>
            •
          </span>
        </span>
      ))}
    </>
  )

  return (
    <div className={`alertbanner alertbanner-${level}`} role="status" aria-live="polite">
      <div className="ticker">
        {/* Two identical runs give a seamless infinite loop. */}
        <div className="ticker-track">
          {run}
          <span aria-hidden>{run}</span>
        </div>
      </div>
    </div>
  )
}
