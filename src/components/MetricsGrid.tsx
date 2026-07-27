import type { CurrentConditions, DayPoint, Settings } from '../types'
import { degToCompass, formatPrecip, formatWind } from '../lib/units'
import { WindCompass } from './WindCompass'
import { SunArc } from './SunArc'
import './MetricsGrid.css'

interface Props {
  current: CurrentConditions
  today: DayPoint | undefined
  settings: Settings
}

function uvLabel(uv: number): string {
  if (uv < 3) return 'Low'
  if (uv < 6) return 'Moderate'
  if (uv < 8) return 'High'
  if (uv < 11) return 'Very High'
  return 'Extreme'
}

export function MetricsGrid({ current, today, settings }: Props) {
  return (
    <section className="metrics">
      <h2 className="section-title">Conditions</h2>
      <div className="metrics-grid">
        <div className="metric glass">
          <div className="card-label">☀️ UV Index</div>
          <div className="metric-value">{current.uvIndex != null ? Math.round(current.uvIndex) : '—'}</div>
          <div className="metric-sub">{current.uvIndex != null ? uvLabel(current.uvIndex) : ''}</div>
        </div>

        <div className="metric glass metric-wide">
          <div className="card-label">🧭 Wind</div>
          <div className="metric-wind">
            <WindCompass direction={current.windDirection} />
            <div>
              <div className="metric-value">{formatWind(current.windSpeed, settings.wind)}</div>
              <div className="metric-sub">
                {degToCompass(current.windDirection)} · Gusts {formatWind(current.windGusts, settings.wind)}
              </div>
            </div>
          </div>
        </div>

        <div className="metric glass">
          <div className="card-label">💧 Humidity</div>
          <div className="metric-value">{Math.round(current.humidity)}%</div>
          <div className="metric-sub">Dew pt {Math.round(current.dewPoint)}°</div>
        </div>

        <div className="metric glass">
          <div className="card-label">🌡️ Feels Like</div>
          <div className="metric-value">{Math.round(current.apparentTemperature)}°</div>
          <div className="metric-sub">Air {Math.round(current.temperature)}°</div>
        </div>

        <div className="metric glass">
          <div className="card-label">🔵 Pressure</div>
          <div className="metric-value">{Math.round(current.pressure)}</div>
          <div className="metric-sub">hPa</div>
        </div>

        <div className="metric glass">
          <div className="card-label">👁️ Visibility</div>
          <div className="metric-value">
            {current.visibility != null ? Math.round(current.visibility / 1000) : '—'}
          </div>
          <div className="metric-sub">km</div>
        </div>

        <div className="metric glass">
          <div className="card-label">☁️ Cloud Cover</div>
          <div className="metric-value">{Math.round(current.cloudCover)}%</div>
          <div className="metric-sub">Precip {formatPrecip(current.precipitation, settings.precip)}</div>
        </div>

        {today && (
          <div className="metric glass metric-wide">
            <div className="card-label">🌅 Sun</div>
            <SunArc sunrise={today.sunrise} sunset={today.sunset} />
          </div>
        )}
      </div>
    </section>
  )
}
