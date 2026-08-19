// Natural language query parser for Weatherly.

import type { DisasterType } from '../types'

export interface ParsedQuery {
  intent: 'disaster' | 'weather' | 'unknown'
  disasterTypes: DisasterType[]
  location?: string
  timeRangeDays?: number
  rawText: string
}

const DISASTER_KEYWORDS: Record<string, DisasterType> = {
  earthquake: 'earthquake',
  quake: 'earthquake',
  seismic: 'earthquake',
  tsunami: 'earthquake',
  volcano: 'volcano',
  volcanic: 'volcano',
  eruption: 'volcano',
  fire: 'wildfire',
  wildfire: 'wildfire',
  bushfire: 'wildfire',
  forest: 'wildfire',
  flood: 'flood',
  flooding: 'flood',
  cyclone: 'cyclone',
  hurricane: 'cyclone',
  typhoon: 'cyclone',
  tornado: 'storm',
  storm: 'storm',
  drought: 'drought',
  disaster: 'other',
}

const TIME_PATTERNS: Array<{ re: RegExp; days: number }> = [
  { re: /past\s+(\d+)\s+days?/i, days: 0 }, // captured separately
  { re: /last\s+(\d+)\s+days?/i, days: 0 },
  { re: /today/i, days: 1 },
  { re: /tonight/i, days: 1 },
  { re: /this\s+week/i, days: 7 },
  { re: /this\s+month/i, days: 30 },
  { re: /24\s*h(?:ours?)?/i, days: 1 },
  { re: /48\s*h(?:ours?)?/i, days: 2 },
]

const WEATHER_KEYWORDS = ['weather', 'forecast', 'temperature', 'wind', 'rain', 'snow', 'humidity']

// Common city/region suffixes to detect location
const LOCATION_RE = /(?:in|near|around|at|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/

export function parseQuery(text: string): ParsedQuery {
  const lower = text.toLowerCase()
  const result: ParsedQuery = {
    intent: 'unknown',
    disasterTypes: [],
    rawText: text,
  }

  // Detect disaster types
  const seen = new Set<DisasterType>()
  for (const [keyword, type] of Object.entries(DISASTER_KEYWORDS)) {
    if (lower.includes(keyword) && !seen.has(type)) {
      seen.add(type)
      result.disasterTypes.push(type)
    }
  }

  // Detect intent
  if (result.disasterTypes.length > 0) {
    result.intent = 'disaster'
  } else if (WEATHER_KEYWORDS.some((k) => lower.includes(k))) {
    result.intent = 'weather'
  }

  // Parse time range
  const numMatch = lower.match(/(?:past|last)\s+(\d+)\s+days?/)
  if (numMatch) {
    result.timeRangeDays = parseInt(numMatch[1], 10)
  } else {
    for (const tp of TIME_PATTERNS) {
      if (tp.re.test(lower)) {
        result.timeRangeDays = tp.days
        break
      }
    }
  }

  // Parse location
  const locMatch = text.match(LOCATION_RE)
  if (locMatch) {
    result.location = locMatch[1]
  }

  return result
}
