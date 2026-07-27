import type { PrecipUnit, Settings, TemperatureUnit, WindUnit } from '../types'

export function cToUnit(celsius: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? celsius * 1.8 + 32 : celsius
}

export function formatTemp(celsius: number, unit: TemperatureUnit, withDegree = true): string {
  const v = Math.round(cToUnit(celsius, unit))
  return withDegree ? `${v}°` : `${v}`
}

export function tempUnitLabel(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C'
}

export function kmhToUnit(kmh: number, unit: WindUnit): number {
  return unit === 'mph' ? kmh * 0.621371 : kmh
}

export function formatWind(kmh: number, unit: WindUnit): string {
  return `${Math.round(kmhToUnit(kmh, unit))} ${unit === 'mph' ? 'mph' : 'km/h'}`
}

export function mmToUnit(mm: number, unit: PrecipUnit): number {
  return unit === 'inch' ? mm / 25.4 : mm
}

export function formatPrecip(mm: number, unit: PrecipUnit): string {
  if (unit === 'inch') {
    const v = mm / 25.4
    return `${v < 0.1 && v > 0 ? v.toFixed(2) : v.toFixed(1)} in`
  }
  return `${mm < 1 && mm > 0 ? mm.toFixed(1) : Math.round(mm)} mm`
}

export function precipUnitLabel(unit: PrecipUnit): string {
  return unit === 'inch' ? 'in' : 'mm'
}

export const DEFAULT_SETTINGS: Settings = {
  temperature: 'fahrenheit',
  wind: 'mph',
  precip: 'inch',
  climateOverlay: true,
  outlookDays: 730,
  theme: 'auto',
}

export function degToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}
