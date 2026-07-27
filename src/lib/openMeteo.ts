import type {
  CurrentConditions,
  DayPoint,
  GeoLocation,
  HourPoint,
  MinutePoint,
  WeatherBundle,
} from '../types'

const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
const CLIMATE = 'https://climate-api.open-meteo.com/v1/climate'

// ---- tiny cache (memory + localStorage) --------------------------------

interface CacheEntry {
  ts: number
  data: unknown
}
const mem = new Map<string, CacheEntry>()

function cacheGet<T>(key: string, ttlMs: number): T | null {
  const now = Date.now()
  const hit = mem.get(key)
  if (hit && now - hit.ts < ttlMs) return hit.data as T
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as CacheEntry
      if (now - parsed.ts < ttlMs) {
        mem.set(key, parsed)
        return parsed.data as T
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function cacheSet(key: string, data: unknown): void {
  const entry: CacheEntry = { ts: Date.now(), data }
  mem.set(key, entry)
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    /* storage full / unavailable — memory cache still works */
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    let reason = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { reason?: string }
      if (body.reason) reason = body.reason
    } catch {
      /* ignore */
    }
    throw new Error(reason)
  }
  return (await res.json()) as T
}

// ---- geocoding ---------------------------------------------------------

interface GeocodeResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
  timezone: string
}

export async function geocode(query: string, count = 6): Promise<GeoLocation[]> {
  const q = query.trim()
  if (!q) return []
  const key = `wx.geo.${q.toLowerCase()}`
  const cached = cacheGet<GeoLocation[]>(key, 24 * 60 * 60 * 1000)
  if (cached) return cached

  const url = `${GEOCODE}?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`
  const data = await getJson<{ results?: GeocodeResult[] }>(url)
  const results: GeoLocation[] = (data.results ?? []).map((r) => ({
    id: `${r.latitude.toFixed(4)},${r.longitude.toFixed(4)}`,
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }))
  cacheSet(key, results)
  return results
}

/** Reverse geocode via the same API's nearest-name search is not supported;
 *  build a minimal location from coordinates instead. */
export async function locationFromCoords(
  latitude: number,
  longitude: number,
): Promise<GeoLocation> {
  return {
    id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    name: 'Current Location',
    latitude,
    longitude,
    timezone: 'auto',
  }
}

// ---- forecast ----------------------------------------------------------

interface ForecastResponse {
  timezone: string
  current: Record<string, number>
  minutely_15?: { time: string[]; precipitation: number[]; precipitation_probability?: (number | null)[] }
  hourly: {
    time: string[]
    temperature_2m: number[]
    apparent_temperature: number[]
    precipitation: number[]
    precipitation_probability: (number | null)[]
    weather_code: number[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
    relative_humidity_2m: number[]
    is_day: number[]
    uv_index: (number | null)[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    precipitation_probability_max: (number | null)[]
    wind_speed_10m_max: number[]
    wind_gusts_10m_max: number[]
    wind_direction_10m_dominant: number[]
    uv_index_max: (number | null)[]
    sunrise: string[]
    sunset: string[]
    daylight_duration: number[]
  }
}

const CURRENT_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'dew_point_2m',
  'visibility',
].join(',')

const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'relative_humidity_2m',
  'is_day',
  'uv_index',
].join(',')

const DAILY_VARS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
  'uv_index_max',
  'sunrise',
  'sunset',
  'daylight_duration',
].join(',')

export async function fetchForecast(loc: GeoLocation): Promise<WeatherBundle> {
  const key = `wx.fc.${loc.id}`
  const cached = cacheGet<WeatherBundle>(key, 10 * 60 * 1000)
  if (cached) return cached

  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    timezone: 'auto',
    forecast_days: '16',
    forecast_minutely_15: '96',
    current: CURRENT_VARS,
    minutely_15: 'precipitation,precipitation_probability',
    hourly: HOURLY_VARS,
    daily: DAILY_VARS,
  })
  const data = await getJson<ForecastResponse>(`${FORECAST}?${params.toString()}`)

  const c = data.current
  const current: CurrentConditions = {
    time: String(c.time),
    isDay: c.is_day === 1,
    temperature: c.temperature_2m,
    apparentTemperature: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    dewPoint: c.dew_point_2m,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    cloudCover: c.cloud_cover,
    pressure: c.pressure_msl,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m,
    uvIndex: null,
    visibility: c.visibility ?? null,
  }

  const minutely: MinutePoint[] = (data.minutely_15?.time ?? []).map((time, i) => ({
    time,
    precipitation: data.minutely_15!.precipitation[i] ?? 0,
    precipitationProbability: data.minutely_15!.precipitation_probability?.[i] ?? null,
  }))

  const h = data.hourly
  const hourly: HourPoint[] = h.time.map((time, i) => ({
    time,
    temperature: h.temperature_2m[i],
    apparentTemperature: h.apparent_temperature[i],
    precipitation: h.precipitation[i],
    precipitationProbability: h.precipitation_probability[i] ?? null,
    weatherCode: h.weather_code[i],
    windSpeed: h.wind_speed_10m[i],
    windDirection: h.wind_direction_10m[i],
    humidity: h.relative_humidity_2m[i],
    isDay: h.is_day[i] === 1,
    uvIndex: h.uv_index[i] ?? null,
  }))

  // current UV: nearest hour
  const nowHour = current.time.slice(0, 13)
  const uvHour = hourly.find((p) => p.time.slice(0, 13) === nowHour)
  current.uvIndex = uvHour?.uvIndex ?? null

  const d = data.daily
  const daily: DayPoint[] = d.time.map((date, i) => ({
    date,
    weatherCode: d.weather_code[i],
    tempMax: d.temperature_2m_max[i],
    tempMin: d.temperature_2m_min[i],
    precipitationSum: d.precipitation_sum[i],
    precipitationProbabilityMax: d.precipitation_probability_max[i] ?? null,
    windSpeedMax: d.wind_speed_10m_max[i],
    windGustsMax: d.wind_gusts_10m_max[i],
    windDirection: d.wind_direction_10m_dominant[i],
    uvIndexMax: d.uv_index_max[i] ?? null,
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
    daylightSeconds: d.daylight_duration[i],
  }))

  const bundle: WeatherBundle = {
    location: { ...loc, timezone: data.timezone },
    current,
    minutely,
    hourly,
    daily,
    fetchedAt: Date.now(),
  }
  cacheSet(key, bundle)
  return bundle
}

// ---- historical archive (for climatological normals) ------------------

export interface DailyArchive {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  weather_code: number[]
}

export async function fetchHistoricalRange(
  loc: GeoLocation,
  startDate: string,
  endDate: string,
): Promise<DailyArchive> {
  const key = `wx.hist.${loc.id}.${startDate}.${endDate}`
  const cached = cacheGet<DailyArchive>(key, 7 * 24 * 60 * 60 * 1000)
  if (cached) return cached

  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    start_date: startDate,
    end_date: endDate,
    timezone: 'auto',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
  })
  const data = await getJson<{ daily: DailyArchive }>(`${ARCHIVE}?${params.toString()}`)
  cacheSet(key, data.daily)
  return data.daily
}

// ---- CMIP6 climate projection (far-future overlay) --------------------

export interface ClimateDaily {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
}

export async function fetchClimate(
  loc: GeoLocation,
  startDate: string,
  endDate: string,
): Promise<ClimateDaily> {
  const key = `wx.clim.${loc.id}.${startDate}.${endDate}`
  const cached = cacheGet<ClimateDaily>(key, 30 * 24 * 60 * 60 * 1000)
  if (cached) return cached

  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    start_date: startDate,
    end_date: endDate,
    models: 'MRI_AGCM3_2_S,EC_Earth3P_HR,MPI_ESM1_2_XR',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
  })
  const data = await getJson<Record<string, unknown> & { daily: Record<string, unknown> }>(
    `${CLIMATE}?${params.toString()}`,
  )
  // Multi-model responses append model suffixes; average them per variable.
  const daily = data.daily
  const time = (daily.time as string[]) ?? []
  const avg = (base: string): number[] => {
    const series = Object.keys(daily)
      .filter((k) => k.startsWith(base))
      .map((k) => daily[k] as (number | null)[])
    return time.map((_, i) => {
      const vals = series.map((s) => s[i]).filter((v): v is number => typeof v === 'number')
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN
    })
  }
  const result: ClimateDaily = {
    time,
    temperature_2m_max: avg('temperature_2m_max'),
    temperature_2m_min: avg('temperature_2m_min'),
    precipitation_sum: avg('precipitation_sum'),
  }
  cacheSet(key, result)
  return result
}
