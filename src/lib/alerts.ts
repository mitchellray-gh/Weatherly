import type { AirQuality, CurrentConditions, HourPoint } from '../types'
import { aqiCategory } from './aqi'

export type AlertLevel = 'info' | 'warning' | 'severe'

export interface WeatherAlert {
  id: string
  level: AlertLevel
  icon: string
  title: string
  detail: string
}

/**
 * Derive human-readable alerts from the current conditions, the next 24h of
 * hourly data, and air quality. Open-Meteo has no official government-warning
 * feed on the free tier, so these are computed from the forecast fields.
 */
export function deriveAlerts(
  current: CurrentConditions,
  hourly: HourPoint[],
  airQuality: AirQuality | null,
): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  const now = Date.now()
  const next24 = hourly.filter((h) => {
    const t = new Date(h.time).getTime()
    return t >= now && t <= now + 24 * 60 * 60 * 1000
  })

  // Thunderstorms (codes 95/96/99).
  const storm = [current.weatherCode, ...next24.map((h) => h.weatherCode)].some((c) => c >= 95)
  if (storm) {
    alerts.push({
      id: 'thunderstorm',
      level: 'severe',
      icon: '⛈️',
      title: 'Thunderstorms expected',
      detail: 'Lightning possible in the next 24 hours. Plan indoor activities.',
    })
  }

  // High wind gusts.
  const maxGust = Math.max(current.windGusts, ...next24.map((h) => h.windSpeed))
  if (maxGust >= 60) {
    alerts.push({
      id: 'wind',
      level: maxGust >= 80 ? 'severe' : 'warning',
      icon: '🌬️',
      title: 'High wind advisory',
      detail: `Gusts up to ${Math.round(maxGust)} km/h expected. Secure loose items.`,
    })
  }

  // Extreme heat / cold (apparent temperature).
  const maxFeels = Math.max(current.apparentTemperature, ...next24.map((h) => h.apparentTemperature))
  const minFeels = Math.min(current.apparentTemperature, ...next24.map((h) => h.apparentTemperature))
  if (maxFeels >= 38) {
    alerts.push({
      id: 'heat',
      level: maxFeels >= 43 ? 'severe' : 'warning',
      icon: '🥵',
      title: 'Extreme heat',
      detail: `Feels like up to ${Math.round(maxFeels)}°. Stay hydrated and out of the sun.`,
    })
  }
  if (minFeels <= -15) {
    alerts.push({
      id: 'cold',
      level: minFeels <= -25 ? 'severe' : 'warning',
      icon: '🥶',
      title: 'Extreme cold',
      detail: `Feels like down to ${Math.round(minFeels)}°. Risk of frostbite — limit exposure.`,
    })
  }

  // Heavy snow (codes 71/73/75/85/86 with meaningful precip).
  const heavySnow = next24.some((h) => [75, 86].includes(h.weatherCode) && h.precipitation >= 1)
  if (heavySnow) {
    alerts.push({
      id: 'snow',
      level: 'warning',
      icon: '❄️',
      title: 'Heavy snow expected',
      detail: 'Significant snowfall in the next 24 hours. Travel may be affected.',
    })
  }

  // Very high UV.
  const maxUv = Math.max(current.uvIndex ?? 0, ...next24.map((h) => h.uvIndex ?? 0))
  if (maxUv >= 8) {
    alerts.push({
      id: 'uv',
      level: 'info',
      icon: '☀️',
      title: 'Very high UV',
      detail: `UV index peaks at ${Math.round(maxUv)}. Wear sunscreen and cover up.`,
    })
  }

  // Poor air quality.
  if (airQuality?.usAqi != null && airQuality.usAqi > 100) {
    const cat = aqiCategory(airQuality.usAqi)
    alerts.push({
      id: 'aqi',
      level: airQuality.usAqi > 150 ? 'severe' : 'warning',
      icon: '😷',
      title: `Air quality: ${cat.label}`,
      detail: cat.advice,
    })
  }

  return alerts
}
