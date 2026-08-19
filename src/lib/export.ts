// GeoJSON / CSV export for disaster and weather data.

import type { DisasterEvent } from '../types'

export function disastersToGeoJSON(events: DisasterEvent[]): string {
  const fc = {
    type: 'FeatureCollection' as const,
    features: events.map((e) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [e.lng, e.lat],
      },
      properties: {
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description ?? '',
        date: e.date,
        source: e.source,
        severity: e.severity ?? '',
        magnitude: e.magnitude ?? null,
        link: e.link ?? '',
      },
    })),
  }
  return JSON.stringify(fc, null, 2)
}

export function disastersToCSV(events: DisasterEvent[]): string {
  const headers = ['id', 'type', 'title', 'date', 'lat', 'lng', 'source', 'severity', 'magnitude', 'link', 'description']
  const rows = events.map((e) =>
    headers
      .map((h) => {
        const val = h === 'lat' ? e.lat : h === 'lng' ? e.lng : (e as any)[h] ?? ''
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      })
      .join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportGeoJSON(events: DisasterEvent[]) {
  const json = disastersToGeoJSON(events)
  const date = new Date().toISOString().slice(0, 10)
  downloadFile(json, `weatherly-disasters-${date}.geojson`, 'application/geo+json')
}

export function exportCSV(events: DisasterEvent[]) {
  const csv = disastersToCSV(events)
  const date = new Date().toISOString().slice(0, 10)
  downloadFile(csv, `weatherly-disasters-${date}.csv`, 'text/csv')
}
