import type { DayPoint, GeoLocation, OutlookDay } from '../types'
import { fetchClimate, fetchHistoricalRange, type ClimateDaily } from './openMeteo'
import { buildNormals, normalForDate, type DayNormal } from './normals'

/** Number of past years to pool for climatological normals. */
const NORMAL_YEARS = 12

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/**
 * Build a unified up-to-a-year outlook:
 *  - real forecast for the days we already have (0–16),
 *  - climatological normals (ERA5 archive, day-of-year) for the rest,
 *  - optional CMIP6 climate-model overlay nudging the normals toward the
 *    projected value for the target calendar date.
 *
 * Every estimate carries a confidence band that widens with lead time.
 */
export async function buildYearOutlook(
  loc: GeoLocation,
  forecast: DayPoint[],
  opts: { climateOverlay: boolean; totalDays?: number },
): Promise<OutlookDay[]> {
  const totalDays = opts.totalDays ?? 365
  const today = new Date(isoDate(new Date()) + 'T00:00:00Z')

  // 1. Historical archive → normals.
  const endHist = addDays(today, -5)
  const startHist = new Date(endHist)
  startHist.setUTCFullYear(startHist.getUTCFullYear() - NORMAL_YEARS)
  let normals: Map<number, DayNormal> = new Map()
  try {
    const archive = await fetchHistoricalRange(loc, isoDate(startHist), isoDate(endHist))
    normals = buildNormals(archive)
  } catch {
    // Normals unavailable → estimates fall back to repeating the last forecast day.
  }

  // 2. Optional climate projection for the coming year window.
  let climate: ClimateDaily | null = null
  if (opts.climateOverlay) {
    const climEnd = addDays(today, totalDays)
    // Climate API only reaches 2050; clamp.
    const maxClim = new Date('2050-12-31T00:00:00Z')
    const clampedEnd = climEnd > maxClim ? maxClim : climEnd
    try {
      climate = await fetchClimate(loc, isoDate(today), isoDate(clampedEnd))
    } catch {
      climate = null
    }
  }
  const climateByDate = new Map<string, { tmax: number; tmin: number; precip: number }>()
  if (climate) {
    climate.time.forEach((t, i) => {
      climateByDate.set(t, {
        tmax: climate!.temperature_2m_max[i],
        tmin: climate!.temperature_2m_min[i],
        precip: climate!.precipitation_sum[i],
      })
    })
  }

  const forecastByDate = new Map(forecast.map((d) => [d.date, d]))
  const out: OutlookDay[] = []

  for (let i = 0; i < totalDays; i++) {
    const date = isoDate(addDays(today, i))
    const fc = forecastByDate.get(date)

    if (fc) {
      out.push({
        date,
        kind: 'forecast',
        weatherCode: fc.weatherCode,
        tempMax: fc.tempMax,
        tempMin: fc.tempMin,
        tempMaxLow: fc.tempMax,
        tempMaxHigh: fc.tempMax,
        tempMinLow: fc.tempMin,
        tempMinHigh: fc.tempMin,
        precipitationSum: fc.precipitationSum,
        precipitationProbability: fc.precipitationProbabilityMax,
      })
      continue
    }

    const normal = normalForDate(normals, date)
    // Lead time beyond the forecast horizon widens the band. Scale by absolute
    // years out (saturating at ~3 years) so bands are consistent regardless of
    // the chosen window length.
    const daysOut = Math.max(0, i - forecast.length)
    const leadFactor = Math.min(1, daysOut / 365 / 3)
    const widen = 1 + leadFactor * 0.8

    if (normal) {
      let tMax = normal.tempMaxMean
      let tMin = normal.tempMinMean
      let precip = normal.precipMean
      const clim = climateByDate.get(date)
      if (clim && Number.isFinite(clim.tmax)) {
        // Blend: 70% normal, 30% climate-model projection.
        tMax = tMax * 0.7 + clim.tmax * 0.3
        tMin = tMin * 0.7 + clim.tmin * 0.3
        if (Number.isFinite(clim.precip)) precip = precip * 0.7 + clim.precip * 0.3
      }
      const maxHalf = ((normal.tempMaxHigh - normal.tempMaxLow) / 2) * widen
      const minHalf = ((normal.tempMinHigh - normal.tempMinLow) / 2) * widen
      out.push({
        date,
        kind: 'estimate',
        weatherCode: normal.modalWeatherCode,
        tempMax: tMax,
        tempMin: tMin,
        tempMaxLow: tMax - maxHalf,
        tempMaxHigh: tMax + maxHalf,
        tempMinLow: tMin - minHalf,
        tempMinHigh: tMin + minHalf,
        precipitationSum: precip,
        precipitationProbability: normal.precipProbability,
      })
    } else {
      // Last-resort fallback: repeat final forecast day.
      const last = forecast[forecast.length - 1]
      if (!last) continue
      const half = 4 * widen
      out.push({
        date,
        kind: 'estimate',
        weatherCode: last.weatherCode,
        tempMax: last.tempMax,
        tempMin: last.tempMin,
        tempMaxLow: last.tempMax - half,
        tempMaxHigh: last.tempMax + half,
        tempMinLow: last.tempMin - half,
        tempMinHigh: last.tempMin + half,
        precipitationSum: last.precipitationSum,
        precipitationProbability: last.precipitationProbabilityMax,
      })
    }
  }

  return out
}
