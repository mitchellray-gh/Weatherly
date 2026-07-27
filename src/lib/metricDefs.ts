import type { CurrentConditions, HourPoint, Settings } from '../types'
import { degToCompass, formatPrecip, formatTemp, formatWind, kmhToUnit } from './units'

export type MetricKey =
  | 'uv'
  | 'wind'
  | 'humidity'
  | 'feels'
  | 'pressure'
  | 'visibility'
  | 'cloud'
  | 'precip'

export interface MetricDef {
  key: MetricKey
  icon: string
  label: string
  /** Big current value shown on the card and at the top of the detail sheet. */
  value: (c: CurrentConditions, s: Settings) => string
  /** Secondary line on the card. */
  sub: (c: CurrentConditions, s: Settings) => string
  /** A friendly paragraph explaining the current reading. */
  describe: (c: CurrentConditions, s: Settings) => string
  /** Extract the hourly series value (in display units) for the trend chart. */
  hourly: (h: HourPoint, s: Settings) => number | null
  unitSuffix: (s: Settings) => string
  color: string
}

function uvLabel(uv: number): string {
  if (uv < 3) return 'Low'
  if (uv < 6) return 'Moderate'
  if (uv < 8) return 'High'
  if (uv < 11) return 'Very High'
  return 'Extreme'
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  uv: {
    key: 'uv',
    icon: '☀️',
    label: 'UV Index',
    value: (c) => (c.uvIndex != null ? String(Math.round(c.uvIndex)) : '—'),
    sub: (c) => (c.uvIndex != null ? uvLabel(c.uvIndex) : ''),
    describe: (c) =>
      c.uvIndex == null
        ? 'UV data is unavailable right now.'
        : `The UV index is ${Math.round(c.uvIndex)} (${uvLabel(
            c.uvIndex,
          )}). ${c.uvIndex >= 6 ? 'Wear sunscreen and limit midday sun exposure.' : 'Low risk from the sun today.'}`,
    hourly: (h) => h.uvIndex,
    unitSuffix: () => '',
    color: '#ffd66b',
  },
  wind: {
    key: 'wind',
    icon: '🧭',
    label: 'Wind',
    value: (c, s) => formatWind(c.windSpeed, s.wind),
    sub: (c, s) => `${degToCompass(c.windDirection)} · Gusts ${formatWind(c.windGusts, s.wind)}`,
    describe: (c, s) =>
      `Wind is ${formatWind(c.windSpeed, s.wind)} from the ${degToCompass(
        c.windDirection,
      )}, with gusts up to ${formatWind(c.windGusts, s.wind)}.`,
    hourly: (h, s) => kmhToUnit(h.windSpeed, s.wind),
    unitSuffix: (s) => (s.wind === 'mph' ? 'mph' : 'km/h'),
    color: '#7ec8ff',
  },
  humidity: {
    key: 'humidity',
    icon: '💧',
    label: 'Humidity',
    value: (c) => `${Math.round(c.humidity)}%`,
    sub: (c) => `Dew pt ${Math.round(c.dewPoint)}°`,
    describe: (c) =>
      `Relative humidity is ${Math.round(c.humidity)}% with a dew point of ${Math.round(
        c.dewPoint,
      )}°. ${c.humidity >= 70 ? 'The air feels muggy.' : c.humidity <= 30 ? 'The air is quite dry.' : 'Comfortable moisture levels.'}`,
    hourly: (h) => h.humidity,
    unitSuffix: () => '%',
    color: '#5ad1e6',
  },
  feels: {
    key: 'feels',
    icon: '🌡️',
    label: 'Feels Like',
    value: (c, s) => formatTemp(c.apparentTemperature, s.temperature),
    sub: (c, s) => `Air ${formatTemp(c.temperature, s.temperature)}`,
    describe: (c, s) => {
      const diff = c.apparentTemperature - c.temperature
      const note =
        Math.abs(diff) < 1
          ? 'close to the actual air temperature.'
          : diff < 0
            ? 'colder than the air temperature due to wind chill.'
            : 'warmer than the air temperature due to humidity and sun.'
      return `It feels like ${formatTemp(c.apparentTemperature, s.temperature)} — ${note}`
    },
    hourly: (h, s) => (s.temperature === 'fahrenheit' ? h.apparentTemperature * 1.8 + 32 : h.apparentTemperature),
    unitSuffix: (s) => (s.temperature === 'fahrenheit' ? '°F' : '°C'),
    color: '#ff9d5c',
  },
  pressure: {
    key: 'pressure',
    icon: '🔵',
    label: 'Pressure',
    value: (c) => String(Math.round(c.pressure)),
    sub: () => 'hPa',
    describe: (c) =>
      `Sea-level pressure is ${Math.round(c.pressure)} hPa. ${c.pressure < 1000 ? 'Low pressure can bring unsettled weather.' : c.pressure > 1020 ? 'High pressure usually means settled, clear conditions.' : 'Near-average pressure.'}`,
    hourly: () => null,
    unitSuffix: () => 'hPa',
    color: '#a0a9ff',
  },
  visibility: {
    key: 'visibility',
    icon: '👁️',
    label: 'Visibility',
    value: (c) => (c.visibility != null ? String(Math.round(c.visibility / 1000)) : '—'),
    sub: () => 'km',
    describe: (c) =>
      c.visibility == null
        ? 'Visibility data is unavailable.'
        : `Visibility is about ${Math.round(c.visibility / 1000)} km. ${c.visibility / 1000 < 2 ? 'Foggy or hazy conditions.' : 'Clear sightlines.'}`,
    hourly: () => null,
    unitSuffix: () => 'km',
    color: '#c8d3e0',
  },
  cloud: {
    key: 'cloud',
    icon: '☁️',
    label: 'Cloud Cover',
    value: (c) => `${Math.round(c.cloudCover)}%`,
    sub: (c, s) => `Precip ${formatPrecip(c.precipitation, s.precip)}`,
    describe: (c) =>
      `Cloud cover is ${Math.round(c.cloudCover)}%. ${c.cloudCover < 25 ? 'Mostly clear skies.' : c.cloudCover > 75 ? 'Overcast.' : 'Partly cloudy.'}`,
    hourly: () => null,
    unitSuffix: () => '%',
    color: '#b8c2d0',
  },
  precip: {
    key: 'precip',
    icon: '🌧️',
    label: 'Precipitation',
    value: (c, s) => formatPrecip(c.precipitation, s.precip),
    sub: () => 'last hour',
    describe: (c, s) =>
      `${formatPrecip(c.precipitation, s.precip)} of precipitation in the last hour.`,
    hourly: (h, s) => (s.precip === 'inch' ? h.precipitation / 25.4 : h.precipitation),
    unitSuffix: (s) => (s.precip === 'inch' ? 'in' : 'mm'),
    color: '#64b5ff',
  },
}
