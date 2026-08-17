// Weather overlay layers — grid data fetching + color ramps for map compositing.

import type { GeoLocation, WeatherLayerId } from '../types'

const FORECAST = 'https://api.open-meteo.com/v1/forecast'

export interface WeatherLayerDef {
  id: WeatherLayerId
  label: string
  icon: string
  color: string
  /** Open-Meteo hourly variable name(s). */
  variables: string[]
  unit: string
}

export const WEATHER_LAYER_DEFS: WeatherLayerDef[] = [
  { id: 'precipitation', label: 'Precipitation', icon: '🌧️', color: '#64b5ff', variables: ['precipitation'], unit: 'mm/h' },
  { id: 'wind', label: 'Wind', icon: '💨', color: '#7ec8ff', variables: ['wind_speed_10m', 'wind_direction_10m'], unit: 'km/h' },
  { id: 'temperature', label: 'Temperature', icon: '🌡️', color: '#ff9d5c', variables: ['temperature_2m'], unit: '°C' },
  { id: 'cloud', label: 'Cloud Cover', icon: '☁️', color: '#b8c2d0', variables: ['cloud_cover'], unit: '%' },
  { id: 'pressure', label: 'Pressure', icon: '🔵', color: '#a0a9ff', variables: ['surface_pressure'], unit: 'hPa' },
  { id: 'snow', label: 'Snowfall', icon: '❄️', color: '#c8e6ff', variables: ['snowfall'], unit: 'cm' },
]

export function getWeatherLayerDef(id: WeatherLayerId): WeatherLayerDef {
  return WEATHER_LAYER_DEFS.find((d) => d.id === id) ?? WEATHER_LAYER_DEFS[0]
}

// ---- Grid data types ------------------------------------------------------

export interface WeatherGridFrame {
  time: string
  /** Primary values (row-major, north→south, west→east). */
  values: number[]
  /** Optional secondary values (e.g. wind direction). */
  values2?: number[]
}

export interface WeatherGridData {
  center: { lat: number; lon: number }
  gridSize: number
  spanDeg: number
  lats: number[]
  lons: number[]
  frames: WeatherGridFrame[]
  layer: WeatherLayerId
}

// ---- Fetching -------------------------------------------------------------

interface PointResponse {
  latitude: number
  longitude: number
  hourly: { time: string[] } & Record<string, (number | null)[]>
  hourly_units?: Record<string, string>
}

const cache = new Map<string, WeatherGridData>()

export async function fetchWeatherGrid(
  loc: GeoLocation,
  layer: WeatherLayerId,
  opts: { gridSize?: number; spanDeg?: number; days?: number } = {},
): Promise<WeatherGridData> {
  const { gridSize = 11, spanDeg = 0.55, days = 3 } = opts
  const def = getWeatherLayerDef(layer)
  const key = `wg.${layer}.${loc.id}.${gridSize}.${spanDeg}.${days}`
  const hit = cache.get(key)
  if (hit) return hit

  const lats: number[] = []
  const lons: number[] = []
  const lonSpan = spanDeg / Math.max(0.2, Math.cos((loc.latitude * Math.PI) / 180))
  for (let r = 0; r < gridSize; r++) {
    const f = gridSize === 1 ? 0.5 : r / (gridSize - 1)
    lats.push(loc.latitude + spanDeg - f * 2 * spanDeg)
  }
  for (let c = 0; c < gridSize; c++) {
    const f = gridSize === 1 ? 0.5 : c / (gridSize - 1)
    lons.push(loc.longitude - lonSpan + f * 2 * lonSpan)
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
    hourly: def.variables.join(','),
    forecast_days: String(Math.min(16, Math.max(1, days))),
    timezone: 'auto',
  })

  const res = await fetch(`${FORECAST}?${params.toString()}`)
  if (!res.ok) throw new Error(`Weather grid request failed: ${res.status}`)
  const json = (await res.json()) as PointResponse[] | PointResponse
  const points = Array.isArray(json) ? json : [json]

  const times = points[0]?.hourly?.time ?? []
  const v1Key = def.variables[0]
  const v2Key = def.variables[1]
  const nPoints = gridSize * gridSize

  const frames: WeatherGridFrame[] = times.map((time, ti) => {
    const values = new Array<number>(nPoints)
    const values2 = v2Key ? new Array<number>(nPoints) : undefined
    for (let p = 0; p < nPoints; p++) {
      values[p] = points[p]?.hourly?.[v1Key]?.[ti] ?? 0
      if (v2Key && values2) {
        values2[p] = points[p]?.hourly?.[v2Key]?.[ti] ?? 0
      }
    }
    return { time, values, values2 }
  })

  const data: WeatherGridData = { center: { lat: loc.latitude, lon: loc.longitude }, gridSize, spanDeg, lats, lons, frames, layer }
  cache.set(key, data)
  return data
}

// ---- Bilinear interpolation -----------------------------------------------

export function bilinearGrid(
  data: WeatherGridData,
  frameIdx: number,
  gx: number,
  gy: number,
  secondary = false,
): number {
  const n = data.gridSize
  const x0 = Math.max(0, Math.min(n - 1, Math.floor(gx)))
  const y0 = Math.max(0, Math.min(n - 1, Math.floor(gy)))
  const x1 = Math.min(n - 1, x0 + 1)
  const y1 = Math.min(n - 1, y0 + 1)
  const fx = gx - x0
  const fy = gy - y0
  const v = secondary ? data.frames[frameIdx].values2 : data.frames[frameIdx].values
  if (!v) return 0
  const v00 = v[y0 * n + x0]
  const v10 = v[y0 * n + x1]
  const v01 = v[y1 * n + x0]
  const v11 = v[y1 * n + x1]
  return (v00 + (v10 - v00) * fx) * (1 - fy) + (v01 + (v11 - v01) * fx) * fy
}

// ---- Color ramps ----------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(c0: [number, number, number], c1: [number, number, number], t: number): [number, number, number] {
  return [Math.round(lerp(c0[0], c1[0], t)), Math.round(lerp(c0[1], c1[1], t)), Math.round(lerp(c0[2], c1[2], t))]
}

function colorFromStops(stops: [number, [number, number, number]][], value: number, max: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, max > 0 ? value / max : 0))
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      const f = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0] || 1)
      return lerpColor(stops[i][1], stops[i + 1][1], f)
    }
  }
  return stops[stops.length - 1][1]
}

/** Precipitation (mm/h) → rgba string. */
export function precipColor(mm: number, alpha = 0.7): string {
  if (mm < 0.05) return `rgba(0,0,0,0)`
  const stops: [number, [number, number, number]][] = [
    [0.1, [80, 170, 255]],
    [0.5, [56, 214, 122]],
    [1.5, [240, 216, 90]],
    [4, [244, 150, 60]],
    [8, [232, 74, 74]],
    [16, [200, 80, 220]],
  ]
  const c = colorFromStops(stops, mm, 16)
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/** Wind speed (km/h) → rgba string. */
export function windColor(kmh: number, alpha = 0.65): string {
  if (kmh < 1) return `rgba(0,0,0,0)`
  const stops: [number, [number, number, number]][] = [
    [0, [100, 200, 255]],
    [20, [80, 180, 240]],
    [40, [120, 220, 120]],
    [60, [240, 220, 80]],
    [80, [240, 140, 50]],
    [120, [220, 60, 60]],
  ]
  const c = colorFromStops(stops, kmh, 120)
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/** Temperature (°C) → rgba string. */
export function tempColor(celsius: number, alpha = 0.6): string {
  const stops: [number, [number, number, number]][] = [
    [-20, [60, 80, 200]],
    [-10, [80, 140, 240]],
    [0, [100, 200, 240]],
    [10, [140, 220, 140]],
    [20, [240, 220, 80]],
    [30, [240, 140, 50]],
    [40, [220, 60, 40]],
  ]
  const c = colorFromStops(stops, celsius, 40)
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/** Cloud cover (%) → rgba string. */
export function cloudColor(pct: number, alpha = 0.55): string {
  if (pct < 5) return `rgba(0,0,0,0)`
  const v = Math.round(80 + (pct / 100) * 140)
  return `rgba(${v}, ${v + 10}, ${v + 20}, ${alpha})`
}

/** Pressure (hPa) → rgba string. */
export function pressureColor(hpa: number, alpha = 0.55): string {
  const stops: [number, [number, number, number]][] = [
    [980, [180, 80, 80]],
    [1000, [200, 160, 80]],
    [1013, [140, 180, 220]],
    [1025, [80, 140, 220]],
    [1040, [60, 100, 200]],
  ]
  const c = colorFromStops(stops, hpa, 1040)
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/** Snowfall (cm) → rgba string. */
export function snowColor(cm: number, alpha = 0.7): string {
  if (cm < 0.1) return `rgba(0,0,0,0)`
  const stops: [number, [number, number, number]][] = [
    [0.1, [200, 220, 255]],
    [1, [160, 200, 255]],
    [3, [120, 170, 240]],
    [6, [80, 140, 220]],
    [10, [60, 100, 200]],
  ]
  const c = colorFromStops(stops, cm, 10)
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/** Dispatch to the right color ramp by layer id. */
export function layerColor(layer: WeatherLayerId, value: number, alpha?: number): string {
  switch (layer) {
    case 'precipitation': return precipColor(value, alpha)
    case 'wind': return windColor(value, alpha)
    case 'temperature': return tempColor(value, alpha)
    case 'cloud': return cloudColor(value, alpha)
    case 'pressure': return pressureColor(value, alpha)
    case 'snow': return snowColor(value, alpha)
    default: return precipColor(value, alpha)
  }
}

// ---- Wind arrow rendering (for canvas) ------------------------------------

export function drawWindArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  speed: number,
  direction: number,
  size: number,
  alpha = 0.7,
) {
  if (speed < 1) return
  const rad = (direction * Math.PI) / 180
  const len = Math.min(size * 2.8, 6 + speed * 0.22)
  const ex = x + Math.sin(rad) * len
  const ey = y - Math.cos(rad) * len
  const c = colorFromStops(
    [[0, [100, 200, 255]], [40, [120, 220, 120]], [80, [240, 180, 60]], [120, [220, 60, 60]]],
    speed,
    120,
  )
  ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
  ctx.lineWidth = Math.max(2, size * 0.18)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  // Arrowhead — larger and more visible
  const headLen = size * 0.45
  const a1 = rad + Math.PI * 0.78
  const a2 = rad - Math.PI * 0.78
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex + Math.sin(a1) * headLen, ey - Math.cos(a1) * headLen)
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex + Math.sin(a2) * headLen, ey - Math.cos(a2) * headLen)
  ctx.stroke()
}
