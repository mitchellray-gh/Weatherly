import type { HourPoint } from '../types'

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
