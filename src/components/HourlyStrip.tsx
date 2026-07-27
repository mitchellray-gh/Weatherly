import type { HourPoint, MinutePoint, Settings } from '../types'
import { describe, iconFor } from '../lib/weatherCodes'
import { formatPrecip, formatTemp } from '../lib/units'
import {
  findNextRain,
  nextRainAbsoluteLabel,
  nextRainRelativeLabel,
} from '../lib/precip'
import './HourlyStrip.css'

interface Props {
  hourly: HourPoint[]
  minutely: MinutePoint[]
  currentPrecip: number
  settings: Settings
  onSelect: (time: string) => void
  onOpenRain: () => void
}

export function HourlyStrip({
  hourly,
  minutely,
  currentPrecip,
  settings,
  onSelect,
  onOpenRain,
}: Props) {
  const now = Date.now()
  const upcoming = hourly
    .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 24)

  if (upcoming.length === 0) return null

  const raining = currentPrecip >= 0.2
  const nextRain = raining ? null : findNextRain(minutely, hourly, now)

  const rainSummary = raining
    ? `Raining now · ${formatPrecip(currentPrecip, settings.precip)}`
    : nextRain
      ? `Rain ${nextRainRelativeLabel(nextRain.time, now)} · ${nextRainAbsoluteLabel(
          nextRain.time,
          now,
        )} · ${describe(nextRain.code)}${
          nextRain.probability != null && nextRain.probability >= 10
            ? ` · ${Math.round(nextRain.probability)}%`
            : ''
        }`
      : 'No rain expected in the coming days'

  return (
    <section className="hourly glass">
      <h2 className="section-title" style={{ margin: '0 0 8px' }}>
        Hourly Forecast
      </h2>

      <button className="hourly-rainrow" onClick={onOpenRain}>
        <span className="hourly-rainrow-icon">
          {raining ? '🌧️' : nextRain ? iconFor(nextRain.code, true) : '☀️'}
        </span>
        <span className="hourly-rainrow-text">{rainSummary}</span>
        <span className="hourly-rainrow-chevron">›</span>
      </button>

      <div className="hourly-scroll no-scrollbar">
        {upcoming.map((h, i) => (
          <button key={h.time} className="hourly-item" onClick={() => onSelect(h.time)}>
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
          </button>
        ))}
      </div>
    </section>
  )
}
