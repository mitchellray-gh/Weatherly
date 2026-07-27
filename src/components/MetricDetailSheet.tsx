import type { AirQuality, CurrentConditions, HourPoint, Settings } from '../types'
import { METRIC_DEFS, type MetricKey } from '../lib/metricDefs'
import { aqiCategory } from '../lib/aqi'
import { Sheet } from './Sheet'
import { Sparkline } from './Sparkline'
import './MetricDetailSheet.css'

export type DetailTarget = MetricKey | 'aqi' | null

interface Props {
  target: DetailTarget
  current: CurrentConditions
  hourly: HourPoint[]
  airQuality: AirQuality | null
  settings: Settings
  onClose: () => void
}

function next24(hourly: HourPoint[]): HourPoint[] {
  const now = Date.now()
  return hourly.filter((h) => {
    const t = new Date(h.time).getTime()
    return t >= now - 60 * 60 * 1000 && t <= now + 24 * 60 * 60 * 1000
  })
}

export function MetricDetailSheet({
  target,
  current,
  hourly,
  airQuality,
  settings,
  onClose,
}: Props) {
  const open = target !== null

  if (target === 'aqi') {
    const aqi = airQuality?.usAqi ?? airQuality?.europeanAqi ?? null
    const cat = aqi != null ? aqiCategory(aqi) : null
    return (
      <Sheet open={open} title="Air Quality" onClose={onClose}>
        <div className="detail">
          <div className="detail-hero">
            <span className="detail-value" style={{ color: cat?.color }}>
              {aqi != null ? Math.round(aqi) : '—'}
            </span>
            <span className="detail-unit">US AQI</span>
          </div>
          {cat && (
            <>
              <div className="detail-badge" style={{ background: cat.color }}>
                {cat.label}
              </div>
              <p className="detail-desc">{cat.advice}</p>
            </>
          )}
          <div className="detail-pollutants">
            {[
              { label: 'PM2.5', v: airQuality?.pm25, unit: 'µg/m³' },
              { label: 'PM10', v: airQuality?.pm10, unit: 'µg/m³' },
              { label: 'Ozone', v: airQuality?.ozone, unit: 'µg/m³' },
              { label: 'NO₂', v: airQuality?.no2, unit: 'µg/m³' },
            ].map((p) => (
              <div key={p.label} className="detail-pollutant">
                <span className="dp-label">{p.label}</span>
                <span className="dp-value">
                  {p.v != null ? Math.round(p.v) : '—'} <span className="dp-unit">{p.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    )
  }

  if (target === null) {
    return <Sheet open={false} title="" onClose={onClose} children={null} />
  }

  const def = METRIC_DEFS[target]
  const window = next24(hourly)
  const series = window.map((h) => def.hourly(h, settings)).filter((v): v is number => v != null)
  const hourLabels = window.map((h) => new Date(h.time).toLocaleTimeString([], { hour: 'numeric' }))
  const hasTrend = series.length >= 2
  const suffix = def.unitSuffix(settings)

  return (
    <Sheet open={open} title={def.label} onClose={onClose}>
      <div className="detail">
        <div className="detail-hero">
          <span className="detail-icon">{def.icon}</span>
          <span className="detail-value">{def.value(current, settings)}</span>
        </div>
        <p className="detail-desc">{def.describe(current, settings)}</p>

        {hasTrend && (
          <div className="detail-trend">
            <div className="detail-trend-head">
              <span>Next 24 hours</span>
              <span className="detail-trend-range">
                {Math.round(Math.min(...series))}–{Math.round(Math.max(...series))}
                {suffix ? ` ${suffix}` : ''}
              </span>
            </div>
            <Sparkline values={series} labels={hourLabels} color={def.color} height={140} />
          </div>
        )}

        <div className="detail-stats">
          {hasTrend && (
            <>
              <div className="detail-stat">
                <span className="ds-label">Now</span>
                <span className="ds-value">
                  {Math.round(series[0])}
                  {suffix}
                </span>
              </div>
              <div className="detail-stat">
                <span className="ds-label">24h High</span>
                <span className="ds-value">
                  {Math.round(Math.max(...series))}
                  {suffix}
                </span>
              </div>
              <div className="detail-stat">
                <span className="ds-label">24h Low</span>
                <span className="ds-value">
                  {Math.round(Math.min(...series))}
                  {suffix}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}
