import { useCallback, useEffect, useState } from 'react'
import type { GeoLocation } from '../types'

const KEY = 'wx.locations'

const DEFAULT_LOCATIONS: GeoLocation[] = [
  {
    id: '37.7749,-122.4194',
    name: 'San Francisco',
    admin1: 'California',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
  },
]

function load(): GeoLocation[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as GeoLocation[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCATIONS
}

export function useLocations() {
  const [locations, setLocations] = useState<GeoLocation[]>(load)
  const [activeId, setActiveId] = useState<string>(() => load()[0]?.id ?? '')

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(locations))
    } catch {
      /* ignore */
    }
  }, [locations])

  const addLocation = useCallback((loc: GeoLocation) => {
    setLocations((prev) => {
      if (prev.some((p) => p.id === loc.id)) return prev
      return [...prev, loc]
    })
    setActiveId(loc.id)
  }, [])

  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => {
      const next = prev.filter((p) => p.id !== id)
      return next.length ? next : DEFAULT_LOCATIONS
    })
    setActiveId((cur) => {
      if (cur !== id) return cur
      const remaining = locations.filter((p) => p.id !== id)
      return remaining[0]?.id ?? DEFAULT_LOCATIONS[0].id
    })
  }, [locations])

  const active = locations.find((l) => l.id === activeId) ?? locations[0]

  return { locations, active, activeId, setActiveId, addLocation, removeLocation }
}
