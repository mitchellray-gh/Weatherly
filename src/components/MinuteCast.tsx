import type { MinutePoint, Settings } from '../types'
import { mmToUnit } from '../lib/units'
import './MinuteCast.css'

interface Props {
  minutely: MinutePoint[]
  settings: Settings
}

export function MinuteCast({ minutely, settings }: Props) {
  const now = Date.now()
  // Next 2 hours of 15-min steps from now.
  const upcoming = minutely
    .filter((m) => new Date(m.time).getTime() >= now - 15 * 60 * 1000)
    .slice(0, 8)

  if (upcoming.length === 0) return null

  const maxRaw = Math.max(...upcoming.map((m) => m.precipitation), 0.1)
  const anyRain = upcoming.some((m) => m.precipitation > 0)

  const summary = anyRain
    ? 'Precipitation expected in the next 2 hours'
    : 'No precipitation for the next 2 hours'

  return (
    <section className="minute glass">
      <h2 className="section-title" style={{ margin: '0 0 4px' }}>
        Next-Hour Precipitation
      </h2>
      <p className="minute-summary">{summary}</p>
      <div className="minute-bars">
        {upcoming.map((m, i) => {
          const height = Math.max(3, (m.precipitation / maxRaw) * 100)
          const value = mmToUnit(m.precipitation, settings.precip)
          return (
            <div key={m.time} className="minute-col">
              <div className="minute-bar-track">
                <div
                  className="minute-bar-fill"
                  style={{ height: `${height}%`, opacity: m.precipitation > 0 ? 1 : 0.25 }}
                  title={`${value.toFixed(2)} ${settings.precip}`}
                />
              </div>
              <div className="minute-time">
                {i === 0 ? 'Now' : new Date(m.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
