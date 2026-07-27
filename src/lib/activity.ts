import type { HourPoint } from '../types'

export interface ActivityWindow {
  time: Date
  score: number // 0–100
  temperature: number // °C
  weatherCode: number
  windSpeed: number
  precipitationProbability: number | null
}

/**
 * Comfort score (0–100) for being outdoors during a given hour.
 * Rewards mild "feels-like" temperatures, dry skies, gentle wind, and low UV.
 */
export function comfortScore(h: HourPoint): number {
  let score = 100

  // Temperature comfort: ideal band ~15–22°C (apparent).
  const t = h.apparentTemperature
  const ideal = 18.5
  score -= Math.min(45, Math.abs(t - ideal) * 2.6)

  // Precipitation likelihood.
  const pop = h.precipitationProbability ?? 0
  score -= pop * 0.5
  if (h.precipitation >= 0.1) score -= 25

  // Wet weather codes (drizzle/rain/snow/thunder).
  if (h.weatherCode >= 51) score -= 15

  // Wind.
  if (h.windSpeed > 20) score -= (h.windSpeed - 20) * 1.1

  // Strong sun.
  if ((h.uvIndex ?? 0) > 7) score -= ((h.uvIndex ?? 0) - 7) * 3

  // Reward pleasant, clearer skies.
  if (h.weatherCode <= 1) score += 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

function bestInWindow(
  hourly: HourPoint[],
  now: number,
  fromHour: number,
  toHour: number,
): ActivityWindow | null {
  let best: ActivityWindow | null = null
  for (const h of hourly) {
    const d = new Date(h.time)
    const t = d.getTime()
    if (t < now) continue
    if (t > now + 7 * 24 * 60 * 60 * 1000) break
    if (!h.isDay) continue
    const hr = d.getHours()
    if (hr < fromHour || hr >= toHour) continue
    const score = comfortScore(h)
    if (!best || score > best.score) {
      best = {
        time: d,
        score,
        temperature: h.temperature,
        weatherCode: h.weatherCode,
        windSpeed: h.windSpeed,
        precipitationProbability: h.precipitationProbability,
      }
    }
  }
  return best
}

export interface BestTimes {
  morningRun: ActivityWindow | null
  eveningWalk: ActivityWindow | null
}

export function findBestTimes(hourly: HourPoint[], now = Date.now()): BestTimes {
  return {
    morningRun: bestInWindow(hourly, now, 5, 10),
    eveningWalk: bestInWindow(hourly, now, 17, 21),
  }
}

export type ActivityKind = 'run' | 'walk'

export const ACTIVITY_HOURS: Record<ActivityKind, [number, number]> = {
  run: [5, 10],
  walk: [17, 21],
}

export const ACTIVITY_META: Record<ActivityKind, { emoji: string; title: string; window: string }> = {
  run: { emoji: '🏃', title: 'Morning Run', window: '5–10 AM' },
  walk: { emoji: '🚶', title: 'Evening Walk', window: '5–9 PM' },
}

/**
 * Best window for the given activity on each of the next `days` days,
 * ranked best-first. Only days that actually have an eligible daylight hour
 * in the window are returned.
 */
export function bestWindowsByDay(
  hourly: HourPoint[],
  kind: ActivityKind,
  now = Date.now(),
  days = 7,
): ActivityWindow[] {
  const [fromHour, toHour] = ACTIVITY_HOURS[kind]
  const byDay = new Map<string, ActivityWindow>()

  for (const h of hourly) {
    const d = new Date(h.time)
    const t = d.getTime()
    if (t < now) continue
    if (t > now + days * 24 * 60 * 60 * 1000) break
    if (!h.isDay) continue
    const hr = d.getHours()
    if (hr < fromHour || hr >= toHour) continue

    const dayKey = h.time.slice(0, 10)
    const score = comfortScore(h)
    const existing = byDay.get(dayKey)
    if (!existing || score > existing.score) {
      byDay.set(dayKey, {
        time: d,
        score,
        temperature: h.temperature,
        weatherCode: h.weatherCode,
        windSpeed: h.windSpeed,
        precipitationProbability: h.precipitationProbability,
      })
    }
  }

  return [...byDay.values()].sort((a, b) => b.score - a.score)
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Beautiful'
  if (score >= 70) return 'Great'
  if (score >= 55) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}
