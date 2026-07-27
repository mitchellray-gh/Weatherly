import type { DailyArchive } from './openMeteo'

export interface DayNormal {
  /** Day-of-year key: 1..366 */
  doy: number
  tempMaxMean: number
  tempMaxLow: number // ~p10
  tempMaxHigh: number // ~p90
  tempMinMean: number
  tempMinLow: number
  tempMinHigh: number
  precipMean: number
  precipProbability: number // fraction of years with measurable precip → %
  modalWeatherCode: number
}

function dayOfYear(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z')
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  return Math.floor((d.getTime() - start) / 86400000)
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base]
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN
}

function mode(xs: number[]): number {
  const counts = new Map<number, number>()
  let best = xs[0] ?? 0
  let bestCount = 0
  for (const x of xs) {
    const c = (counts.get(x) ?? 0) + 1
    counts.set(x, c)
    if (c > bestCount) {
      bestCount = c
      best = x
    }
  }
  return best
}

/**
 * Build day-of-year climatological normals from a multi-year daily archive.
 * A centered ±3-day window is pooled around each day-of-year to smooth noise.
 */
export function buildNormals(archive: DailyArchive): Map<number, DayNormal> {
  const byDoy = new Map<
    number,
    { tmax: number[]; tmin: number[]; precip: number[]; wet: number; total: number; codes: number[] }
  >()

  for (let i = 0; i < archive.time.length; i++) {
    const doy = dayOfYear(archive.time[i])
    const tmax = archive.temperature_2m_max[i]
    const tmin = archive.temperature_2m_min[i]
    const precip = archive.precipitation_sum[i]
    const code = archive.weather_code[i]
    if (tmax == null || tmin == null) continue
    let bucket = byDoy.get(doy)
    if (!bucket) {
      bucket = { tmax: [], tmin: [], precip: [], wet: 0, total: 0, codes: [] }
      byDoy.set(doy, bucket)
    }
    bucket.tmax.push(tmax)
    bucket.tmin.push(tmin)
    if (precip != null) {
      bucket.precip.push(precip)
      bucket.total++
      if (precip >= 1) bucket.wet++
    }
    if (code != null) bucket.codes.push(code)
  }

  // Smooth with a ±3-day window.
  const normals = new Map<number, DayNormal>()
  for (let doy = 1; doy <= 366; doy++) {
    const tmax: number[] = []
    const tmin: number[] = []
    const precip: number[] = []
    const codes: number[] = []
    let wet = 0
    let total = 0
    for (let w = -3; w <= 3; w++) {
      let key = doy + w
      if (key < 1) key += 366
      if (key > 366) key -= 366
      const b = byDoy.get(key)
      if (!b) continue
      tmax.push(...b.tmax)
      tmin.push(...b.tmin)
      precip.push(...b.precip)
      codes.push(...b.codes)
      wet += b.wet
      total += b.total
    }
    if (tmax.length === 0) continue
    const smax = [...tmax].sort((a, b) => a - b)
    const smin = [...tmin].sort((a, b) => a - b)
    normals.set(doy, {
      doy,
      tempMaxMean: mean(tmax),
      tempMaxLow: quantile(smax, 0.1),
      tempMaxHigh: quantile(smax, 0.9),
      tempMinMean: mean(tmin),
      tempMinLow: quantile(smin, 0.1),
      tempMinHigh: quantile(smin, 0.9),
      precipMean: mean(precip),
      precipProbability: total ? (wet / total) * 100 : 0,
      modalWeatherCode: codes.length ? mode(codes) : 3,
    })
  }
  return normals
}

export function normalForDate(normals: Map<number, DayNormal>, iso: string): DayNormal | undefined {
  return normals.get(dayOfYear(iso))
}
