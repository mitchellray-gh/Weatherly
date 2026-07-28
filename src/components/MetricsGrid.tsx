import type { AirQuality, CurrentConditions, DayPoint, Settings } from '../types'
import { METRIC_DEFS, type MetricKey } from '../lib/metricDefs'
import { aqiCategory } from '../lib/aqi'
import type { DetailTarget } from './MetricDetailSheet'
import { WindCompass } from './WindCompass'
import { SunArc } from './SunArc'
import './MetricsGrid.css'

interface Props {
  current: CurrentConditions
  today: DayPoint | undefined
  airQuality: AirQuality | null
  settings: Settings
  onSelect: (target: DetailTarget) => void
  onSun: () => void
}

const CARD_ORDER: MetricKey[] = ['feels', 'humidity', 'uv', 'pressure', 'visibility', 'cloud']

export function MetricsGrid({ current, today, airQuality, settings, onSelect, onSun }: Props) {
  const aqiVal = airQuality?.usAqi ?? airQuality?.europeanAqi ?? null
  const aqiCat = aqiVal != null ? aqiCategory(aqiVal) : null

  return (
    <section className="metrics">
      <h2 className="section-title">Conditions</h2>
      <div className="metrics-grid">
        {/* Wind — wide card with compass */}
        <button
          className="metric glass metric-wide metric-btn"
          onClick={() => onSelect('wind')}
          aria-label="Wind details"
        >
          <div className="card-label">🧭 Wind</div>
          <div className="metric-wind">
            <WindCompass direction={current.windDirection} />
            <div>
              <div className="metric-value">{METRIC_DEFS.wind.value(current, settings)}</div>
              <div className="metric-sub">{METRIC_DEFS.wind.sub(current, settings)}</div>
            </div>
          </div>
        </button>

        {/* Air Quality */}
        <button
          className="metric glass metric-btn"
          onClick={() => onSelect('aqi')}
          aria-label="Air quality details"
        >
          <div className="card-label">😮‍💨 Air Quality</div>
          <div className="metric-value" style={{ color: aqiCat?.color }}>
            {aqiVal != null ? Math.round(aqiVal) : '—'}
          </div>
          <div className="metric-sub">{aqiCat ? aqiCat.label : 'Unavailable'}</div>
        </button>

        {CARD_ORDER.map((key) => {
          const def = METRIC_DEFS[key]
          return (
            <button
              key={key}
              className="metric glass metric-btn"
              onClick={() => onSelect(key)}
              aria-label={`${def.label} details`}
            >
              <div className="card-label">
                {def.icon} {def.label}
              </div>
              <div className="metric-value">{def.value(current, settings)}</div>
              <div className="metric-sub">{def.sub(current, settings)}</div>
            </button>
          )
        })}

        {today && (
          <button className="metric glass metric-wide metric-btn" onClick={onSun} aria-label="Sun details">
            <div className="card-label">🌅 Sun</div>
            <SunArc sunrise={today.sunrise} sunset={today.sunset} />
          </button>
        )}
      </div>
    </section>
  )
}
