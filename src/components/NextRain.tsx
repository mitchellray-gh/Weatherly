import type { HourPoint, MinutePoint, Settings } from '../types'
import { describe, iconFor } from '../lib/weatherCodes'
import { formatPrecip } from '../lib/units'
import './NextRain.css'

interface Props {
  minutely: MinutePoint[]
  hourly: HourPoint[]
  currentPrecip: number
  settings: Settings
}

/** WMO codes >= 51 are drizzle/rain/snow/showers/thunder — i.e. precipitation. */
function isWetCode(code: number): boolean {
  return code >= 51
}

interface RainEvent {
  time: Date
  amount: number
  code: number
  probability: number | null
}

function findNextRain(
  minutely: MinutePoint[],
  hourly: HourPoint[],
  now: number,
): RainEvent | null {
  // 1. High-resolution 15-minute data first (most precise near-term onset).
  for (const m of minutely) {
    const t = new Date(m.time).getTime()
    if (t < now) continue
    if (m.precipitation >= 0.1) {
      return {
        time: new Date(m.time),
        amount: m.precipitation,
        code: 61,
        probability: m.precipitationProbability,
      }
    }
  }

  // 2. Fall back to hourly data across the full 16-day horizon.
  for (const h of hourly) {
    const t = new Date(h.time).getTime()
    if (t < now) continue
    const wet = h.precipitation >= 0.1 || isWetCode(h.weatherCode)
    const likely = (h.precipitationProbability ?? 0) >= 40
    if (wet && (h.precipitation >= 0.1 || likely)) {
      return {
        time: new Date(h.time),
        amount: h.precipitation,
        code: h.weatherCode,
        probability: h.precipitationProbability,
      }
    }
  }

  return null
}

function relativeLabel(target: Date, now: number): string {
  const diffMin = Math.round((target.getTime() - now) / 60000)
  if (diffMin <= 0) return 'now'
  if (diffMin < 60) return `in ${diffMin} min`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `in ${hours} hr${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

function absoluteLabel(target: Date, now: number): string {
  const withinDay = target.getTime() - now < 24 * 60 * 60 * 1000
  if (withinDay) {
    return target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return target.toLocaleDateString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })
}

export function NextRain({ minutely, hourly, currentPrecip, settings }: Props) {
  const now = Date.now()

  if (currentPrecip >= 0.1) {
    return (
      <section className="nextrain glass raining">
        <div className="nextrain-icon">🌧️</div>
        <div className="nextrain-body">
          <div className="nextrain-title">It&rsquo;s raining now</div>
          <div className="nextrain-sub">
            Currently {formatPrecip(currentPrecip, settings.precip)} · see the next-hour bars below
          </div>
        </div>
      </section>
    )
  }

  const event = findNextRain(minutely, hourly, now)

  if (!event) {
    return (
      <section className="nextrain glass dry">
        <div className="nextrain-icon">☀️</div>
        <div className="nextrain-body">
          <div className="nextrain-title">No rain expected</div>
          <div className="nextrain-sub">Nothing in the forecast for the next 16 days</div>
        </div>
      </section>
    )
  }

  return (
    <section className="nextrain glass">
      <div className="nextrain-icon">{iconFor(event.code, true)}</div>
      <div className="nextrain-body">
        <div className="nextrain-title">Rain expected {relativeLabel(event.time, now)}</div>
        <div className="nextrain-sub">
          {absoluteLabel(event.time, now)}
          {' · '}
          {describe(event.code)}
          {event.probability != null && event.probability >= 10
            ? ` · ${Math.round(event.probability)}% chance`
            : ''}
          {event.amount >= 0.1 ? ` · ${formatPrecip(event.amount, settings.precip)}` : ''}
        </div>
      </div>
    </section>
  )
}
