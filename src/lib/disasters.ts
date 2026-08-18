// Fetch + normalize natural disaster events from USGS, NASA EONET, and GDACS.

import type { DisasterEvent, DisasterType } from '../types'

// ---- USGS Earthquakes (M4.5+ past 30 days) --------------------------------

interface USGSFeature {
  id: string
  properties: {
    mag: number | null
    place: string
    time: number
    url?: string
    type: string
  }
  geometry: { coordinates: [number, number, number] }
}

async function fetchUSGS(): Promise<DisasterEvent[]> {
  const res = await fetch(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson',
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.features as USGSFeature[]).map((f) => ({
    id: `usgs-${f.id}`,
    type: 'earthquake' as DisasterType,
    title: f.properties.place || 'Earthquake',
    date: new Date(f.properties.time).toISOString(),
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    source: 'usgs' as const,
    severity: f.properties.mag != null ? `M ${f.properties.mag.toFixed(1)}` : undefined,
    magnitude: f.properties.mag ?? undefined,
    link: f.properties.url ? `https://earthquake.usgs.gov${f.properties.url}` : undefined,
  }))
}

// ---- NASA EONET (wildfires, volcanoes, storms — past 30 days) ---------------

interface EONETEvent {
  id: string
  title: string
  description?: string
  categories: { id: string; title: string }[]
  sources: { id: string; url: string }[]
  geometry: { date: string; type: string; coordinates: number[] | number[][] }[]
  closed?: string | null
}

const EONET_CAT_MAP: Record<string, DisasterType> = {
  wildfires: 'wildfire',
  severeStorms: 'storm',
  volcanoes: 'volcano',
  seaLakeIce: 'other',
  floods: 'flood',
  drought: 'drought',
  landslides: 'other',
  oceanWaves: 'other',
  dustHaze: 'other',
  manmade: 'other',
  snow: 'other',
  tempExtremes: 'other',
  waterColor: 'other',
}

function mapEONETType(categories: { id: string }[]): DisasterType {
  for (const c of categories) {
    const mapped = EONET_CAT_MAP[c.id]
    if (mapped && mapped !== 'other') return mapped
  }
  return 'other'
}

async function fetchEONET(): Promise<DisasterEvent[]> {
  const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?days=30&status=all&limit=200')
  if (!res.ok) return []
  const data = await res.json()
  const events: DisasterEvent[] = []
  for (const ev of data.events as EONETEvent[]) {
    // Use the most recent geometry point
    const geo = ev.geometry[ev.geometry.length - 1]
    if (!geo || geo.type !== 'Point') continue
    const coords = geo.coordinates as number[]
    if (coords.length < 2) continue
    events.push({
      id: `eonet-${ev.id}`,
      type: mapEONETType(ev.categories),
      title: ev.title,
      description: ev.description,
      date: geo.date || new Date().toISOString(),
      lat: coords[1],
      lng: coords[0],
      source: 'nasa-eonet',
      link: ev.sources?.[0]?.url,
    })
  }
  return events
}

// ---- GDACS RSS (floods, cyclones, droughts, forest fires) -------------------

function parseGDACSDate(text: string): string {
  const d = new Date(text)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

interface GDACSEvent {
  id: string
  type: DisasterType
  title: string
  date: string
  lat: number
  lng: number
  severity?: string
  link?: string
}

function parseGDACSRss(xmlText: string): GDACSEvent[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const items = doc.querySelectorAll('item')
  const events: GDACSEvent[] = []

  for (const item of items) {
    const title = item.querySelector('title')?.textContent?.trim() || ''
    const link = item.querySelector('link')?.textContent?.trim() || ''
    const pubDate = item.querySelector('pubDate')?.textContent?.trim() || ''
    const desc = item.querySelector('description')?.textContent?.trim() || ''

    // Extract coordinates from description or GeoRSS
    const geoLat = item.querySelector('geo\\:lat, lat')?.textContent
    const geoLng = item.querySelector('geo\\:long, long')?.textContent
    if (!geoLat || !geoLng) continue

    const lat = parseFloat(geoLat)
    const lng = parseFloat(geoLng)
    if (isNaN(lat) || isNaN(lng)) continue

    // Determine type from GDACS alert type in the link or description
    let dtype: DisasterType = 'other'
    const linkLower = link.toLowerCase()
    const descLower = desc.toLowerCase()
    if (linkLower.includes('eventtype=eq') || descLower.includes('earthquake')) dtype = 'earthquake'
    else if (linkLower.includes('eventtype=fl') || descLower.includes('flood')) dtype = 'flood'
    else if (linkLower.includes('eventtype=tc') || descLower.includes('cyclone')) dtype = 'cyclone'
    else if (linkLower.includes('eventtype=vo') || descLower.includes('volcano')) dtype = 'volcano'
    else if (linkLower.includes('eventtype=wf') || descLower.includes('fire')) dtype = 'wildfire'
    else if (linkLower.includes('eventtype=dr') || descLower.includes('drought')) dtype = 'drought'

    events.push({
      id: `gdacs-${link.split('eventid=')[1]?.split('&')[0] || title}`,
      type: dtype,
      title,
      date: parseGDACSDate(pubDate),
      lat,
      lng,
      link: link.startsWith('http') ? link : `https://www.gdacs.org/${link}`,
    })
  }
  return events
}

async function fetchGDACS(): Promise<DisasterEvent[]> {
  try {
    const res = await fetch('https://www.gdacs.org/xml/rss.xml')
    if (!res.ok) return []
    const text = await res.text()
    return parseGDACSRss(text).map((e) => ({ ...e, source: 'gdacs' as const }))
  } catch {
    return []
  }
}

// ---- Merge + deduplicate ---------------------------------------------------

function dedup(events: DisasterEvent[]): DisasterEvent[] {
  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return events
}

let cache: { events: DisasterEvent[]; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function fetchDisasters(): Promise<DisasterEvent[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.events

  const [usgs, eonet, gdacs] = await Promise.allSettled([fetchUSGS(), fetchEONET(), fetchGDACS()])

  const all: DisasterEvent[] = [
    ...(usgs.status === 'fulfilled' ? usgs.value : []),
    ...(eonet.status === 'fulfilled' ? eonet.value : []),
    ...(gdacs.status === 'fulfilled' ? gdacs.value : []),
  ]

  const merged = dedup(all)
  cache = { events: merged, ts: Date.now() }
  return merged
}

export const DISASTER_TYPE_LABELS: Record<DisasterType, string> = {
  earthquake: 'Earthquakes',
  wildfire: 'Wildfires',
  volcano: 'Volcanoes',
  flood: 'Floods',
  cyclone: 'Cyclones',
  drought: 'Droughts',
  storm: 'Storms',
  other: 'Other',
}

export const DISASTER_TYPE_ICONS: Record<DisasterType, string> = {
  earthquake: '🔴',
  wildfire: '🟠',
  volcano: '🟣',
  flood: '🔵',
  cyclone: '🌀',
  drought: '🟤',
  storm: '⚡',
  other: '⚪',
}

export const DISASTER_TYPE_COLORS: Record<DisasterType, string> = {
  earthquake: '#e84a4a',
  wildfire: '#f4963c',
  volcano: '#c850dc',
  flood: '#50aaff',
  cyclone: '#38d67a',
  drought: '#c9a96e',
  storm: '#f0d85a',
  other: '#aaa',
}
