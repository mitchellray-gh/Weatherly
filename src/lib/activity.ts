import type { HourPoint } from '../types'

export interface ActivityWindow {
  time: Date
  score: number // 0–100
  temperature: number // °C
  weatherCode: number
  windSpeed: number
  precipitationProbability: number | null
}

/** Context that makes scoring relative to the location's current season. */
export interface ScoreContext {
  /** Typical daytime feels-like temperature over the forecast window (°C). */
  refTemp: number
}

const IDEAL_TEMP = 18.5

function median(xs: number[]): number {
  if (xs.length === 0) return IDEAL_TEMP
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Build a seasonal reference from the forecast: the median daytime feels-like
 * temperature over the window. This anchors comfort scoring to "typical for
 * right now here" rather than an absolute warm-weather ideal, so a cold month
 * still surfaces its best relative days.
 */
export function buildScoreContext(hourly: HourPoint[], now = Date.now(), days = 7): ScoreContext {
  const temps: number[] = []
  for (const h of hourly) {
    const t = new Date(h.time).getTime()
    if (t < now) continue
    if (t > now + days * 24 * 60 * 60 * 1000) break
    if (!h.isDay) continue
    temps.push(h.apparentTemperature)
  }
  return { refTemp: median(temps) }
}

/**
 * Comfort score (0–100) for being outdoors during a given hour.
 * Temperature is judged relative to the seasonal norm (via `ctx`): the best
 * days in any month score well; only conditions worse than typical for the
 * season are penalized. Precipitation, wind, and harsh sun still apply.
 */
export function comfortScore(h: HourPoint, ctx?: ScoreContext): number {
  let score = 100

  // Relative temperature comfort.
  const t = h.apparentTemperature
  const ref = ctx?.refTemp ?? IDEAL_TEMP
  // How far this month typically sits from the comfortable ideal.
  const seasonalGap = Math.abs(ref - IDEAL_TEMP)
  const raw = Math.abs(t - IDEAL_TEMP)
  // Penalize mainly how much *worse than the seasonal norm* this hour is,
  // plus a gentle absolute nudge so genuinely pleasant hours still edge ahead.
  const relative = Math.max(0, raw - seasonalGap) * 2.4
  const absolute = raw * 0.35
  score -= Math.min(45, relative + absolute)

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
  ctx: ScoreContext,
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
    const score = comfortScore(h, ctx)
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
  const ctx = buildScoreContext(hourly, now)
  return {
    morningRun: bestInWindow(hourly, ctx, now, 5, 10),
    eveningWalk: bestInWindow(hourly, ctx, now, 17, 21),
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
  const ctx = buildScoreContext(hourly, now, days)
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
    const score = comfortScore(h, ctx)
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
