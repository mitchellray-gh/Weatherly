import type { GeoLocation } from '../types'

const FORECAST = 'https://api.open-meteo.com/v1/forecast'

export interface RadarFrame {
  time: string
  /** Precipitation (mm) per grid point, row-major (north→south, west→east). */
  values: number[]
}

export interface RadarData {
  center: { lat: number; lon: number }
  gridSize: number // N x N
  spanDeg: number // half-span in degrees from center to edge
  lats: number[] // length gridSize (north→south)
  lons: number[] // length gridSize (west→east)
  frames: RadarFrame[]
  maxValue: number
}

interface PointForecast {
  latitude: number
  longitude: number
  hourly: { time: string[]; precipitation: number[] }
}

// simple session cache
const cache = new Map<string, RadarData>()

/**
 * Build a precipitation "radar" from an N×N grid of Open-Meteo forecast points
 * around a location. Returns hourly frames going out `days` days (up to 16).
 */
export async function fetchRadar(
  loc: GeoLocation,
  { gridSize = 11, spanDeg = 0.55, days = 7 }: { gridSize?: number; spanDeg?: number; days?: number } = {},
): Promise<RadarData> {
  const key = `${loc.id}|${gridSize}|${spanDeg}|${days}`
  const hit = cache.get(key)
  if (hit) return hit

  // Build grid: north→south rows, west→east cols.
  const lats: number[] = []
  const lons: number[] = []
  // cos-correct the longitude span so cells look roughly square.
  const lonSpan = spanDeg / Math.max(0.2, Math.cos((loc.latitude * Math.PI) / 180))
  for (let r = 0; r < gridSize; r++) {
    const f = gridSize === 1 ? 0.5 : r / (gridSize - 1)
    lats.push(loc.latitude + spanDeg - f * (2 * spanDeg))
  }
  for (let c = 0; c < gridSize; c++) {
    const f = gridSize === 1 ? 0.5 : c / (gridSize - 1)
    lons.push(loc.longitude - lonSpan + f * (2 * lonSpan))
  }

  const latList: number[] = []
  const lonList: number[] = []
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      latList.push(Number(lats[r].toFixed(4)))
      lonList.push(Number(lons[c].toFixed(4)))
    }
  }

  const params = new URLSearchParams({
    latitude: latList.join(','),
    longitude: lonList.join(','),
    hourly: 'precipitation',
    forecast_days: String(Math.min(16, Math.max(1, days))),
    timezone: 'auto',
  })

  const res = await fetch(`${FORECAST}?${params.toString()}`)
  if (!res.ok) throw new Error(`Radar request failed: ${res.status}`)
  const json = (await res.json()) as PointForecast[] | PointForecast
  const points = Array.isArray(json) ? json : [json]

  const times = points[0]?.hourly?.time ?? []
  const nPoints = gridSize * gridSize
  let maxValue = 0
  const frames: RadarFrame[] = times.map((time, ti) => {
    const values = new Array<number>(nPoints)
    for (let p = 0; p < nPoints; p++) {
      const v = points[p]?.hourly?.precipitation?.[ti] ?? 0
      values[p] = v
      if (v > maxValue) maxValue = v
    }
    return { time, values }
  })

  const data: RadarData = {
    center: { lat: loc.latitude, lon: loc.longitude },
    gridSize,
    spanDeg,
    lats,
    lons,
    frames,
    maxValue,
  }
  cache.set(key, data)
  return data
}

/** Precipitation intensity (mm/h) → radar color (rgba string). */
export function radarColor(mm: number): string {
  if (mm < 0.05) return 'rgba(0,0,0,0)'
  // Green → yellow → orange → red → magenta, like weather radar.
  const stops: [number, [number, number, number]][] = [
    [0.1, [80, 170, 255]], // very light — light blue
    [0.5, [56, 214, 122]], // light — green
    [1.5, [240, 216, 90]], // moderate — yellow
    [4, [244, 150, 60]], // heavy — orange
    [8, [232, 74, 74]], // very heavy — red
    [16, [200, 80, 220]], // extreme — magenta
  ]
  let color = stops[0][1]
  let alpha = 0.55
  for (let i = 0; i < stops.length; i++) {
    if (mm >= stops[i][0]) {
      color = stops[i][1]
      alpha = Math.min(0.92, 0.55 + i * 0.08)
    }
  }
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
}
