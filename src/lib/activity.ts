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

function isWetCode(code: number): boolean {
  return code >= 51
}
function isSnowCode(code: number): boolean {
  return [71, 73, 75, 77, 85, 86].includes(code)
}

// --- Activity catalog ---------------------------------------------------

export type ActivityId = string

export interface ActivityProfile {
  /** Absolute ideal feels-like temperature (°C). Omit to score vs. seasonal norm. */
  tempIdeal?: number
  /** Width of the comfortable temperature band (>1 = more forgiving). */
  tolerance?: number
  /** Wind penalty multiplier. */
  wind?: number
  /** Precipitation penalty multiplier. */
  rain?: number
  /** Bonus for clear skies. */
  clearBonus?: number
  /** Any measurable precipitation in the hour disqualifies it. */
  requiresDry?: boolean
  minTemp?: number
  maxTemp?: number
}

export type ActivityCategory = 'Fitness' | 'Yard & Home' | 'Leisure' | 'Water' | 'Seasonal'

export interface ActivityDef {
  id: string
  emoji: string
  title: string
  category: ActivityCategory
  /** Local-hour window [from, to). */
  hours: [number, number]
  windowLabel: string
  /** Short blurb shown in the detail sheet. */
  desc: string
  /** Night activity (default: daytime only). */
  night?: boolean
  /** Only surfaces when its trigger condition is met this week. */
  conditional?: boolean
  /** Enabled by default in Settings. */
  defaultOn?: boolean
  profile: ActivityProfile
  /** Relevance test for conditional activities. */
  trigger?: (hourly: HourPoint[], now: number) => boolean
}

function snowExpected(hourly: HourPoint[], now: number, days = 3): boolean {
  const end = now + days * 24 * 60 * 60 * 1000
  return hourly.some((h) => {
    const t = new Date(h.time).getTime()
    return t >= now && t <= end && (isSnowCode(h.weatherCode) || h.temperature <= 0)
  })
}

export const ACTIVITIES: ActivityDef[] = [
  // Fitness
  {
    id: 'morning-run',
    emoji: '🏃',
    title: 'Morning Run',
    category: 'Fitness',
    hours: [5, 10],
    windowLabel: '5–10 AM',
    desc: 'A cool, calm morning is ideal for a run.',
    defaultOn: true,
    profile: { wind: 1.1 },
  },
  {
    id: 'evening-run',
    emoji: '🌆',
    title: 'Evening Run',
    category: 'Fitness',
    hours: [17, 20],
    windowLabel: '5–8 PM',
    desc: 'An after-work run once the peak heat fades.',
    profile: { wind: 1.1 },
  },
  {
    id: 'evening-walk',
    emoji: '🚶',
    title: 'Evening Walk',
    category: 'Fitness',
    hours: [17, 21],
    windowLabel: '5–9 PM',
    desc: 'A relaxed stroll in the evening.',
    defaultOn: true,
    profile: {},
  },
  {
    id: 'dog-walk',
    emoji: '🐕',
    title: 'Dog Walk',
    category: 'Fitness',
    hours: [6, 21],
    windowLabel: 'Daytime',
    desc: 'Comfortable conditions for you and your dog.',
    defaultOn: true,
    profile: {},
  },
  {
    id: 'bike-ride',
    emoji: '🚴',
    title: 'Bike Ride',
    category: 'Fitness',
    hours: [7, 19],
    windowLabel: 'Daytime',
    desc: 'Low wind makes for the best ride.',
    defaultOn: true,
    profile: { wind: 1.7, rain: 1.2 },
  },
  {
    id: 'hiking',
    emoji: '🥾',
    title: 'Hiking',
    category: 'Fitness',
    hours: [7, 16],
    windowLabel: 'Morning–afternoon',
    desc: 'Dry, mild days for the trail.',
    profile: { rain: 1.3 },
  },
  {
    id: 'outdoor-yoga',
    emoji: '🧘',
    title: 'Outdoor Yoga',
    category: 'Fitness',
    hours: [6, 10],
    windowLabel: 'Morning',
    desc: 'Still, dry mornings to flow outside.',
    profile: { wind: 1.5, requiresDry: true },
  },
  {
    id: 'tennis',
    emoji: '🎾',
    title: 'Tennis',
    category: 'Fitness',
    hours: [7, 19],
    windowLabel: 'Daytime',
    desc: 'Dry courts and light wind.',
    profile: { wind: 1.5, requiresDry: true },
  },
  {
    id: 'golf',
    emoji: '⛳',
    title: 'Golf',
    category: 'Fitness',
    hours: [7, 17],
    windowLabel: 'Daytime',
    desc: 'Calm, dry conditions for the course.',
    profile: { wind: 1.4, rain: 1.3 },
  },

  // Yard & Home
  {
    id: 'mow-lawn',
    emoji: '🌿',
    title: 'Mow the Lawn',
    category: 'Yard & Home',
    hours: [9, 18],
    windowLabel: 'Daytime',
    desc: 'Dry grass makes mowing far easier.',
    defaultOn: true,
    profile: { requiresDry: true, rain: 1.5 },
  },
  {
    id: 'gardening',
    emoji: '🪴',
    title: 'Gardening',
    category: 'Yard & Home',
    hours: [8, 18],
    windowLabel: 'Daytime',
    desc: 'Mild, dry hours to tend the garden.',
    profile: { requiresDry: true },
  },
  {
    id: 'wash-car',
    emoji: '🚗',
    title: 'Wash the Car',
    category: 'Yard & Home',
    hours: [9, 17],
    windowLabel: 'Daytime',
    desc: 'Dry, with no rain due right after.',
    profile: { requiresDry: true, rain: 1.4, minTemp: 5 },
  },
  {
    id: 'paint-outdoors',
    emoji: '🎨',
    title: 'Outdoor Painting',
    category: 'Yard & Home',
    hours: [10, 17],
    windowLabel: 'Daytime',
    desc: 'Warm, dry weather so paint cures well.',
    profile: { requiresDry: true, minTemp: 10, rain: 1.6 },
  },
  {
    id: 'grill',
    emoji: '🔥',
    title: 'Backyard BBQ',
    category: 'Yard & Home',
    hours: [16, 20],
    windowLabel: 'Evening',
    desc: 'A warm, dry evening for the grill.',
    profile: { tempIdeal: 22, requiresDry: true, wind: 1.2 },
  },

  // Leisure
  {
    id: 'picnic',
    emoji: '🧺',
    title: 'Picnic',
    category: 'Leisure',
    hours: [11, 16],
    windowLabel: 'Midday',
    desc: 'Warm, dry, sunny — perfect for a picnic.',
    profile: { tempIdeal: 22, requiresDry: true, clearBonus: 8 },
  },
  {
    id: 'beach-day',
    emoji: '🏖️',
    title: 'Beach Day',
    category: 'Leisure',
    hours: [10, 17],
    windowLabel: 'Midday',
    desc: 'Hot, sunny, and dry for the shore.',
    profile: { tempIdeal: 28, minTemp: 22, requiresDry: true, clearBonus: 12 },
  },
  {
    id: 'photography',
    emoji: '📷',
    title: 'Golden-Hour Photos',
    category: 'Leisure',
    hours: [17, 20],
    windowLabel: 'Evening',
    desc: 'Clear skies for warm, low-angle light.',
    profile: { clearBonus: 14, rain: 1.3 },
  },
  {
    id: 'stargazing',
    emoji: '🌌',
    title: 'Stargazing',
    category: 'Leisure',
    hours: [20, 24],
    windowLabel: 'Night',
    desc: 'Clear, dry nights reveal the most stars.',
    night: true,
    profile: { clearBonus: 18, rain: 1.6 },
  },
  {
    id: 'rooftop',
    emoji: '🍷',
    title: 'Rooftop Evening',
    category: 'Leisure',
    hours: [17, 22],
    windowLabel: 'Evening',
    desc: 'A mild, dry evening out.',
    profile: { tempIdeal: 22, requiresDry: true },
  },

  // Water
  {
    id: 'paddle',
    emoji: '🛶',
    title: 'Kayak / Paddle',
    category: 'Water',
    hours: [8, 18],
    windowLabel: 'Daytime',
    desc: 'Warm and calm water — low wind matters.',
    profile: { tempIdeal: 25, minTemp: 15, wind: 1.8, requiresDry: true },
  },
  {
    id: 'fishing',
    emoji: '🎣',
    title: 'Fishing',
    category: 'Water',
    hours: [5, 19],
    windowLabel: 'Dawn–dusk',
    desc: 'Calm, settled conditions on the water.',
    profile: { wind: 1.3 },
  },

  // Seasonal (conditional — surface only when relevant)
  {
    id: 'shovel-snow',
    emoji: '🧹',
    title: 'Shovel the Driveway',
    category: 'Seasonal',
    hours: [7, 17],
    windowLabel: 'Daytime',
    desc: 'The calmest daylight window to clear snow.',
    conditional: true,
    defaultOn: true,
    profile: { tempIdeal: 0, tolerance: 3, wind: 1.4 },
    trigger: (h, now) => snowExpected(h, now, 3),
  },
  {
    id: 'build-snowman',
    emoji: '⛄',
    title: 'Build a Snowman',
    category: 'Seasonal',
    hours: [9, 16],
    windowLabel: 'Daytime',
    desc: 'Fresh snow and near-freezing temps pack best.',
    conditional: true,
    defaultOn: true,
    profile: { tempIdeal: -1, tolerance: 3, maxTemp: 2, rain: 0.3, wind: 1.2 },
    trigger: (h, now) => snowExpected(h, now, 3),
  },
]

export const ACTIVITY_BY_ID: Record<string, ActivityDef> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a]),
)

/** Back-compat: metadata lookup used by the detail sheet. */
export const ACTIVITY_META: Record<string, { emoji: string; title: string; window: string }> =
  Object.fromEntries(
    ACTIVITIES.map((a) => [a.id, { emoji: a.emoji, title: a.title, window: a.windowLabel }]),
  )

export type ActivityKind = string

export const DEFAULT_ACTIVITIES: string[] = ACTIVITIES.filter((a) => a.defaultOn).map((a) => a.id)

// --- Scoring ------------------------------------------------------------

/** 0–100 comfort/suitability score for one hour, or -1 if disqualified. */
export function activityScore(h: HourPoint, ctx: ScoreContext, def: ActivityDef): number {
  const p = def.profile
  if (p.requiresDry && h.precipitation >= 0.2) return -1
  if (p.minTemp != null && h.apparentTemperature < p.minTemp) return -1
  if (p.maxTemp != null && h.apparentTemperature > p.maxTemp) return -1

  const tol = p.tolerance ?? 1
  const windMul = p.wind ?? 1
  const rainMul = p.rain ?? 1

  let score = 100
  const t = h.apparentTemperature
  if (p.tempIdeal != null) {
    score -= Math.min(45, (Math.abs(t - p.tempIdeal) * 3) / tol)
  } else {
    const seasonalGap = Math.abs(ctx.refTemp - IDEAL_TEMP)
    const raw = Math.abs(t - IDEAL_TEMP)
    const relative = Math.max(0, raw - seasonalGap) * 2.4
    const absolute = raw * 0.35
    score -= Math.min(45, (relative + absolute) / tol)
  }

  const pop = h.precipitationProbability ?? 0
  score -= pop * 0.5 * rainMul
  if (h.precipitation >= 0.1) score -= 25 * rainMul
  if (isWetCode(h.weatherCode)) score -= 15 * rainMul
  if (h.windSpeed > 20) score -= (h.windSpeed - 20) * 1.1 * windMul
  if ((h.uvIndex ?? 0) > 7) score -= ((h.uvIndex ?? 0) - 7) * 3
  if (h.weatherCode <= 1) score += p.clearBonus ?? 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

function inWindow(def: ActivityDef, d: Date): boolean {
  const hr = d.getHours()
  const [from, to] = def.hours
  return hr >= from && hr < to
}

/** The single best upcoming window for an activity over the next `days` days. */
export function bestActivityWindow(
  hourly: HourPoint[],
  id: string,
  now = Date.now(),
  days = 7,
): ActivityWindow | null {
  const def = ACTIVITY_BY_ID[id]
  if (!def) return null
  const ctx = buildScoreContext(hourly, now, days)
  let best: ActivityWindow | null = null
  for (const h of hourly) {
    const d = new Date(h.time)
    const t = d.getTime()
    if (t < now) continue
    if (t > now + days * 24 * 60 * 60 * 1000) break
    if (def.night ? h.isDay : !h.isDay) continue
    if (!inWindow(def, d)) continue
    const score = activityScore(h, ctx, def)
    if (score < 0) continue
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

/** Best window per day, ranked best-first — used by the detail sheet. */
export function bestWindowsByDay(
  hourly: HourPoint[],
  id: string,
  now = Date.now(),
  days = 7,
): ActivityWindow[] {
  const def = ACTIVITY_BY_ID[id]
  if (!def) return []
  const ctx = buildScoreContext(hourly, now, days)
  const byDay = new Map<string, ActivityWindow>()

  for (const h of hourly) {
    const d = new Date(h.time)
    const t = d.getTime()
    if (t < now) continue
    if (t > now + days * 24 * 60 * 60 * 1000) break
    if (def.night ? h.isDay : !h.isDay) continue
    if (!inWindow(def, d)) continue

    const score = activityScore(h, ctx, def)
    if (score < 0) continue
    const dayKey = h.time.slice(0, 10)
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

export interface ActivitySuggestion {
  def: ActivityDef
  window: ActivityWindow
}

/**
 * Resolve the enabled activities into ranked suggestion cards. Conditional
 * activities (e.g. snow shovelling) only appear when triggered, and are
 * surfaced first as timely alerts.
 */
export function activitySuggestions(
  hourly: HourPoint[],
  enabledIds: string[],
  now = Date.now(),
): ActivitySuggestion[] {
  const out: ActivitySuggestion[] = []
  for (const id of enabledIds) {
    const def = ACTIVITY_BY_ID[id]
    if (!def) continue
    if (def.conditional && !(def.trigger?.(hourly, now) ?? false)) continue
    const window = bestActivityWindow(hourly, id, now)
    if (window) out.push({ def, window })
  }
  return out.sort((a, b) => {
    const ac = a.def.conditional ? 1 : 0
    const bc = b.def.conditional ? 1 : 0
    if (ac !== bc) return bc - ac // conditional alerts first
    return b.window.score - a.window.score
  })
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Beautiful'
  if (score >= 70) return 'Great'
  if (score >= 55) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}
