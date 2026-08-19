// Risk scoring engine — blends weather, disaster, and terrain signals into 0–100.

import type { CurrentConditions, AirQuality, DisasterEvent } from '../types'

export interface RiskFactors {
  weatherScore: number    // 0-30
  disasterScore: number  // 0-30
  terrainScore: number   // 0-10
  aqiScore: number       // 0-15
  exposureScore: number  // 0-15
}

export interface RiskResult {
  total: number           // 0-100
  label: string
  color: string
  factors: RiskFactors
}

const RISK_LABELS: Array<{ min: number; label: string; color: string }> = [
  { min: 80, label: 'Extreme', color: '#dc2626' },
  { min: 60, label: 'High', color: '#ea580c' },
  { min: 40, label: 'Moderate', color: '#d97706' },
  { min: 20, label: 'Low', color: '#65a30d' },
  { min: 0, label: 'Minimal', color: '#16a34a' },
]

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function scoreWeather(current: CurrentConditions): number {
  let score = 0

  // Wind: >60 km/h is risky, >100 is severe
  score += clamp((current.windSpeed - 40) / 60, 0, 1) * 10
  score += clamp((current.windGusts - 60) / 80, 0, 1) * 5

  // Temperature extremes
  if (current.apparentTemperature > 35) score += clamp((current.apparentTemperature - 35) / 15, 0, 1) * 8
  if (current.apparentTemperature < -10) score += clamp((-10 - current.apparentTemperature) / 30, 0, 1) * 8

  // Heavy precip
  score += clamp(current.precipitation / 20, 0, 1) * 4

  // Severe weather codes (thunderstorms, heavy snow, etc.)
  if (current.weatherCode >= 95) score += 3

  return clamp(score, 0, 30)
}

function scoreDisasters(events: DisasterEvent[], lat: number, lng: number): number {
  if (!events.length) return 0
  let score = 0

  for (const e of events) {
    const dist = Math.sqrt(Math.pow(e.lat - lat, 2) + Math.pow(e.lng - lng, 2))
    const proximity = clamp(1 - dist / 15, 0, 1) // 15° radius
    let severity = 1

    if (e.magnitude) {
      severity = clamp((e.magnitude - 3) / 5, 0, 1) // M3 = low, M8 = max
    } else if (e.severity) {
      const s = e.severity.toLowerCase()
      if (s.includes('extreme') || s.includes('severe')) severity = 1
      else if (s.includes('moderate') || s.includes('orange')) severity = 0.6
      else if (s.includes('minor') || s.includes('yellow')) severity = 0.3
    }

    score = Math.max(score, proximity * severity * 30)
  }

  return clamp(score, 0, 30)
}

function scoreAQI(aqi: AirQuality | null): number {
  if (!aqi?.usAqi) return 0
  // AQI 0-50 = good, 100-150 = unhealthy for sensitive, 200+ = very unhealthy
  return clamp((aqi.usAqi - 50) / 200, 0, 1) * 15
}

function scoreTerrain(elevation: number | null, lat: number): number {
  let score = 0
  // High altitude risk
  if (elevation != null && elevation > 3000) {
    score += clamp((elevation - 3000) / 5000, 0, 1) * 6
  }
  // Coastal exposure (within ~50km of equator or poles = more storm exposure)
  const absLat = Math.abs(lat)
  if (absLat < 25 || absLat > 60) {
    score += 4 // tropical cyclone / polar storm belt
  }
  return clamp(score, 0, 10)
}

function scoreExposure(current: CurrentConditions): number {
  let score = 0
  // Low visibility = bad
  if (current.visibility != null && current.visibility < 1000) {
    score += clamp((1000 - current.visibility) / 1000, 0, 1) * 8
  }
  // High UV
  if (current.uvIndex != null && current.uvIndex >= 8) {
    score += clamp((current.uvIndex - 8) / 7, 0, 1) * 7
  }
  return clamp(score, 0, 15)
}

export function computeRisk(
  current: CurrentConditions,
  aqi: AirQuality | null,
  disasters: DisasterEvent[],
  lat: number,
  lng: number,
  elevation: number | null,
): RiskResult {
  const factors: RiskFactors = {
    weatherScore: scoreWeather(current),
    disasterScore: scoreDisasters(disasters, lat, lng),
    terrainScore: scoreTerrain(elevation, lat),
    aqiScore: scoreAQI(aqi),
    exposureScore: scoreExposure(current),
  }

  const total = Math.round(
    factors.weatherScore + factors.disasterScore + factors.terrainScore +
    factors.aqiScore + factors.exposureScore
  )

  const tier = RISK_LABELS.find((t) => total >= t.min) ?? RISK_LABELS[RISK_LABELS.length - 1]

  return { total: clamp(total, 0, 100), label: tier.label, color: tier.color, factors }
}
