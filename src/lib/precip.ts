import type { HourPoint, MinutePoint } from '../types'

/** Total precipitation that rounds to 0.05 in over 24 h — the "meaningful rain" bar. */
export const RAIN_24H_THRESHOLD_MM = 1.27 // 0.05 inch

/** A single-step amount below this rounds to 0.00 in — treat as no precipitation. */
export const MEASURABLE_MM = 0.2 // ~0.008 inch

/** Sum of forecast precipitation (mm) over the next `hours` hours. */
export function precipSumMm(hourly: HourPoint[], hours = 24, now = Date.now()): number {
  const end = now + hours * 60 * 60 * 1000
  let sum = 0
  for (const h of hourly) {
    const t = new Date(h.time).getTime()
    if (t < now) continue
    if (t > end) break
    sum += h.precipitation || 0
  }
  return sum
}

/** Whether meaningful rain (>= 0.05 in) is expected in the next 24 hours. */
export function hasRainNext24h(hourly: HourPoint[], now = Date.now()): boolean {
  return precipSumMm(hourly, 24, now) >= RAIN_24H_THRESHOLD_MM
}

export interface RainEvent {
  time: Date
  amount: number // mm
  code: number
  probability: number | null
}

function isWetCode(code: number): boolean {
  return code >= 51
}

/**
 * The next moment measurable precipitation is expected. Uses high-resolution
 * 15-minute data first, then falls back to hourly. Requires a measurable
 * forecast amount — a wet weather code or probability alone does not count.
 */
export function findNextRain(
  minutely: MinutePoint[],
  hourly: HourPoint[],
  now = Date.now(),
): RainEvent | null {
  for (const m of minutely) {
    const t = new Date(m.time).getTime()
    if (t < now) continue
    if (m.precipitation >= MEASURABLE_MM) {
      return { time: new Date(m.time), amount: m.precipitation, code: 61, probability: m.precipitationProbability }
    }
  }
  for (const h of hourly) {
    const t = new Date(h.time).getTime()
    if (t < now) continue
    if (h.precipitation >= MEASURABLE_MM) {
      return {
        time: new Date(h.time),
        amount: h.precipitation,
        code: isWetCode(h.weatherCode) ? h.weatherCode : 61,
        probability: h.precipitationProbability,
      }
    }
  }
  return null
}

export function nextRainRelativeLabel(target: Date, now = Date.now()): string {
  const diffMin = Math.round((target.getTime() - now) / 60000)
  if (diffMin <= 0) return 'now'
  if (diffMin < 60) return `in ${diffMin} min`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `in ${hours} hr${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

export function nextRainAbsoluteLabel(target: Date, now = Date.now()): string {
  const withinDay = target.getTime() - now < 24 * 60 * 60 * 1000
  if (withinDay) return target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return target.toLocaleDateString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })
}
