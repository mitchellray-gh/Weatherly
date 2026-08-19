// Threshold-based weather alerting system.

import type { CurrentConditions, GeoLocation } from '../types'

export type ThresholdMetric =
  | 'temperature'
  | 'feelsLike'
  | 'windSpeed'
  | 'windGusts'
  | 'precipitation'
  | 'humidity'
  | 'uvIndex'
  | 'visibility'
  | 'pressure'
  | 'aqi'

export type ThresholdOp = '>' | '<' | '>=' | '<=' | '=='

export interface ThresholdRule {
  id: string
  locationId: string
  metric: ThresholdMetric
  op: ThresholdOp
  value: number
  label?: string
  cooldownMinutes: number
  lastTriggeredAt: number | null
  enabled: boolean
}

export interface ThresholdAlert {
  ruleId: string
  location: GeoLocation
  metric: ThresholdMetric
  op: ThresholdOp
  threshold: number
  actual: number
  triggeredAt: number
}

const STORAGE_KEY = 'wx.thresholds'

export const METRIC_LABELS: Record<ThresholdMetric, string> = {
  temperature: 'Temperature',
  feelsLike: 'Feels Like',
  windSpeed: 'Wind Speed',
  windGusts: 'Wind Gusts',
  precipitation: 'Precipitation',
  humidity: 'Humidity',
  uvIndex: 'UV Index',
  visibility: 'Visibility',
  pressure: 'Pressure',
  aqi: 'AQI',
}

export const METRIC_UNITS: Record<ThresholdMetric, string> = {
  temperature: '°',
  feelsLike: '°',
  windSpeed: ' km/h',
  windGusts: ' km/h',
  precipitation: ' mm',
  humidity: '%',
  uvIndex: '',
  visibility: ' km',
  pressure: ' hPa',
  aqi: '',
}

export const OP_LABELS: Record<ThresholdOp, string> = {
  '>': 'above',
  '<': 'below',
  '>=': 'at least',
  '<=': 'at most',
  '==': 'equals',
}

function loadRules(): ThresholdRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

function saveRules(rules: ThresholdRule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  } catch {
    /* ignore */
  }
}

let rules: ThresholdRule[] = loadRules()
let listeners: (() => void)[] = []

function notify() {
  for (const fn of listeners) fn()
}

export function subscribeThresholds(fn: () => void): () => void {
  listeners = [...listeners, fn]
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getRules(): ThresholdRule[] {
  return rules
}

export function addRule(rule: Omit<ThresholdRule, 'id' | 'lastTriggeredAt' | 'enabled'>): ThresholdRule {
  const newRule: ThresholdRule = {
    ...rule,
    id: crypto.randomUUID(),
    lastTriggeredAt: null,
    enabled: true,
  }
  rules = [...rules, newRule]
  saveRules(rules)
  notify()
  return newRule
}

export function updateRule(id: string, patch: Partial<ThresholdRule>) {
  rules = rules.map((r) => (r.id === id ? { ...r, ...patch } : r))
  saveRules(rules)
  notify()
}

export function removeRule(id: string) {
  rules = rules.filter((r) => r.id !== id)
  saveRules(rules)
  notify()
}

function extractMetric(current: CurrentConditions, aqi: number | null, metric: ThresholdMetric): number | null {
  switch (metric) {
    case 'temperature': return current.temperature
    case 'feelsLike': return current.apparentTemperature
    case 'windSpeed': return current.windSpeed
    case 'windGusts': return current.windGusts
    case 'precipitation': return current.precipitation
    case 'humidity': return current.humidity
    case 'uvIndex': return current.uvIndex ?? 0
    case 'visibility': return current.visibility != null ? current.visibility / 1000 : null
    case 'pressure': return current.pressure
    case 'aqi': return aqi
  }
}

function evalOp(actual: number, op: ThresholdOp, threshold: number): boolean {
  switch (op) {
    case '>': return actual > threshold
    case '<': return actual < threshold
    case '>=': return actual >= threshold
    case '<=': return actual <= threshold
    case '==': return Math.abs(actual - threshold) < 0.01
  }
}

/**
 * Evaluate all rules against a set of conditions. Returns newly triggered alerts.
 */
export function evaluateRules(
  location: GeoLocation,
  current: CurrentConditions,
  aqi: number | null,
): ThresholdAlert[] {
  const now = Date.now()
  const triggered: ThresholdAlert[] = []
  let changed = false

  rules = rules.map((rule) => {
    if (!rule.enabled || rule.locationId !== location.id) return rule

    // Cooldown check
    if (rule.lastTriggeredAt) {
      const elapsed = (now - rule.lastTriggeredAt) / 60000
      if (elapsed < rule.cooldownMinutes) return rule
    }

    const actual = extractMetric(current, aqi, rule.metric)
    if (actual === null) return rule

    if (evalOp(actual, rule.op, rule.value)) {
      changed = true
      triggered.push({
        ruleId: rule.id,
        location,
        metric: rule.metric,
        op: rule.op,
        threshold: rule.value,
        actual,
        triggeredAt: now,
      })
      return { ...rule, lastTriggeredAt: now }
    }

    return rule
  })

  if (changed) saveRules(rules)
  return triggered
}

/**
 * Get active breach count for a location (rules currently triggered).
 */
export function getActiveBreaches(
  locationId: string,
  current: CurrentConditions,
  aqi: number | null,
): number {
  let count = 0
  for (const rule of rules) {
    if (!rule.enabled || rule.locationId !== locationId) continue
    const actual = extractMetric(current, aqi, rule.metric)
    if (actual !== null && evalOp(actual, rule.op, rule.value)) count++
  }
  return count
}
