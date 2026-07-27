import type { DayPoint, Settings } from '../types'
import { iconFor } from '../lib/weatherCodes'
import { cToUnit, formatTemp } from '../lib/units'
import './DailyList.css'

interface Props {
  daily: DayPoint[]
  settings: Settings
}

function weekday(iso: string, i: number): string {
  if (i === 0) return 'Today'
  return new Date(iso + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })
}

export function DailyList({ daily, settings }: Props) {
  if (daily.length === 0) return null

  // Global temperature range across the shown days for consistent bar scaling.
  const mins = daily.map((d) => cToUnit(d.tempMin, settings.temperature))
  const maxs = daily.map((d) => cToUnit(d.tempMax, settings.temperature))
  const lo = Math.min(...mins)
  const hi = Math.max(...maxs)
  const span = Math.max(1, hi - lo)

  return (
    <section className="daily glass">
      <h2 className="section-title" style={{ margin: '0 0 6px' }}>
        {daily.length}-Day Forecast
      </h2>
      <ul className="daily-list">
        {daily.map((d, i) => {
          const dMin = cToUnit(d.tempMin, settings.temperature)
          const dMax = cToUnit(d.tempMax, settings.temperature)
          const left = ((dMin - lo) / span) * 100
          const width = ((dMax - dMin) / span) * 100
          return (
            <li key={d.date} className="daily-row">
              <span className="daily-day">{weekday(d.date, i)}</span>
              <span className="daily-icon">{iconFor(d.weatherCode, true)}</span>
              <span className="daily-pop">
                {d.precipitationProbabilityMax != null && d.precipitationProbabilityMax >= 10
                  ? `${Math.round(d.precipitationProbabilityMax)}%`
                  : ''}
              </span>
              <span className="daily-min">{formatTemp(d.tempMin, settings.temperature)}</span>
              <span className="daily-bar-track">
                <span
                  className="daily-bar-fill"
                  style={{ left: `${left}%`, width: `${Math.max(6, width)}%` }}
                />
              </span>
              <span className="daily-max">{formatTemp(d.tempMax, settings.temperature)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
