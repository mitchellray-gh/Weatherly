import type { HourPoint, Settings } from '../types'
import { iconFor } from '../lib/weatherCodes'
import { formatTemp } from '../lib/units'
import './HourlyStrip.css'

interface Props {
  hourly: HourPoint[]
  settings: Settings
}

export function HourlyStrip({ hourly, settings }: Props) {
  const now = Date.now()
  const upcoming = hourly
    .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 24)

  if (upcoming.length === 0) return null

  return (
    <section className="hourly glass">
      <h2 className="section-title" style={{ margin: '0 0 10px' }}>
        Hourly Forecast
      </h2>
      <div className="hourly-scroll no-scrollbar">
        {upcoming.map((h, i) => (
          <div key={h.time} className="hourly-item">
            <div className="hourly-time">
              {i === 0 ? 'Now' : new Date(h.time).toLocaleTimeString([], { hour: 'numeric' })}
            </div>
            <div className="hourly-icon">{iconFor(h.weatherCode, h.isDay)}</div>
            {h.precipitationProbability != null && h.precipitationProbability >= 10 ? (
              <div className="hourly-pop">{Math.round(h.precipitationProbability)}%</div>
            ) : (
              <div className="hourly-pop hourly-pop-empty" />
            )}
            <div className="hourly-temp">{formatTemp(h.temperature, settings.temperature)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
