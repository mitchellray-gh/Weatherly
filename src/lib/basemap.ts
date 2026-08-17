// Web-Mercator raster basemap tiles (multiple providers, CORS-enabled) for maps.

export type BasemapStyleId = 'carto' | 'topo' | 'satellite' | 'terrain' | 'dark'

export interface BasemapStyle {
  id: BasemapStyleId
  label: string
  icon: string
  /** URL template: {z}, {x}, {y} and optionally {s} for subdomains. */
  urlTemplate: string
  subdomains?: string[]
  attribution: string
  /** Max zoom supported by this provider. */
  maxZoom: number
}

export const BASEMAP_STYLES: BasemapStyle[] = [
  {
    id: 'carto',
    label: 'Street',
    icon: '🗺️',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '© OpenStreetMap contributors, © CARTO',
    maxZoom: 18,
  },
  {
    id: 'topo',
    label: 'Topo',
    icon: '🏔️',
    urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '© OpenMapTiles, © OpenStreetMap contributors, SRTM',
    maxZoom: 17,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    icon: '🛰️',
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  {
    id: 'terrain',
    label: 'Terrain',
    icon: '🌍',
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_BaseMap/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, USGS, ESA',
    maxZoom: 13,
  },
  {
    id: 'dark',
    label: 'Dark',
    icon: '🌙',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '© OpenStreetMap contributors, © CARTO',
    maxZoom: 18,
  },
]

export function getBasemapStyle(id: BasemapStyleId): BasemapStyle {
  return BASEMAP_STYLES.find((s) => s.id === id) ?? BASEMAP_STYLES[0]
}

// ---- Overlay types --------------------------------------------------------

export type OverlayId = 'hillshade' | 'contours'

export interface OverlayDef {
  id: OverlayId
  label: string
  icon: string
  urlTemplate: string
  subdomains?: string[]
  attribution: string
  defaultOpacity: number
}

export const OVERLAY_DEFS: OverlayDef[] = [
  {
    id: 'hillshade',
    label: 'Hillshade',
    icon: '⛰️',
    urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '© OpenTopoMap',
    defaultOpacity: 0.35,
  },
  {
    id: 'contours',
    label: 'Contours',
    icon: '📐',
    urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '© OpenTopoMap',
    defaultOpacity: 0.45,
  },
]

export function getOverlayDef(id: OverlayId): OverlayDef {
  return OVERLAY_DEFS.find((o) => o.id === id) ?? OVERLAY_DEFS[0]
}

// ---- Mercator math --------------------------------------------------------

export interface BasemapTile {
  url: string
  dx: number
  dy: number
  dw: number
  dh: number
}

export interface Basemap {
  z: number
  tiles: BasemapTile[]
}

function lon2px(lon: number, z: number): number {
  return ((lon + 180) / 360) * Math.pow(2, z) * 256
}

function lat2px(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z) * 256
}

function buildTileUrl(template: string, z: number, x: number, y: number, subs?: string[]): string {
  const wx = x
  let url = template.replace('{z}', String(z)).replace('{x}', String(wx)).replace('{y}', String(y))
  if (subs && url.includes('{s}')) {
    url = url.replace('{s}', subs[Math.abs(x + y) % subs.length])
  }
  return url
}

/**
 * Compute tiles for any basemap style covering the given bbox, positioned
 * for a canvas of size W×H.
 */
export function computeBasemap(
  west: number,
  east: number,
  north: number,
  south: number,
  W: number,
  H: number,
  styleId: BasemapStyleId = 'carto',
): Basemap {
  const style = getBasemapStyle(styleId)
  const fraction = (east - west) / 360
  let z = Math.round(Math.log2(3 / Math.max(1e-6, fraction)))
  z = Math.max(4, Math.min(style.maxZoom, Math.min(12, z)))

  const pxWest = lon2px(west, z)
  const pxEast = lon2px(east, z)
  const pxNorth = lat2px(north, z)
  const pxSouth = lat2px(south, z)
  const spanX = pxEast - pxWest
  const spanY = pxSouth - pxNorth

  const worldTiles = Math.pow(2, z)
  const txMin = Math.floor(pxWest / 256)
  const txMax = Math.floor(pxEast / 256)
  const tyMin = Math.max(0, Math.floor(pxNorth / 256))
  const tyMax = Math.min(worldTiles - 1, Math.floor(pxSouth / 256))

  const tiles: BasemapTile[] = []
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      const wx = ((tx % worldTiles) + worldTiles) % worldTiles
      tiles.push({
        url: buildTileUrl(style.urlTemplate, z, wx, ty, style.subdomains),
        dx: ((tx * 256 - pxWest) / spanX) * W,
        dy: ((ty * 256 - pxNorth) / spanY) * H,
        dw: (256 / spanX) * W,
        dh: (256 / spanY) * H,
      })
    }
  }
  return { z, tiles }
}

/** Compute overlay tiles (same bbox math, different provider). */
export function computeOverlay(
  west: number,
  east: number,
  north: number,
  south: number,
  W: number,
  H: number,
  overlayId: OverlayId,
): Basemap {
  const def = getOverlayDef(overlayId)
  const fraction = (east - west) / 360
  let z = Math.round(Math.log2(3 / Math.max(1e-6, fraction)))
  z = Math.max(4, Math.min(12, z))

  const pxWest = lon2px(west, z)
  const pxEast = lon2px(east, z)
  const pxNorth = lat2px(north, z)
  const pxSouth = lat2px(south, z)
  const spanX = pxEast - pxWest
  const spanY = pxSouth - pxNorth

  const worldTiles = Math.pow(2, z)
  const txMin = Math.floor(pxWest / 256)
  const txMax = Math.floor(pxEast / 256)
  const tyMin = Math.max(0, Math.floor(pxNorth / 256))
  const tyMax = Math.min(worldTiles - 1, Math.floor(pxSouth / 256))

  const tiles: BasemapTile[] = []
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      const wx = ((tx % worldTiles) + worldTiles) % worldTiles
      tiles.push({
        url: buildTileUrl(def.urlTemplate, z, wx, ty, def.subdomains),
        dx: ((tx * 256 - pxWest) / spanX) * W,
        dy: ((ty * 256 - pxNorth) / spanY) * H,
        dw: (256 / spanX) * W,
        dh: (256 / spanY) * H,
      })
    }
  }
  return { z, tiles }
}

// ---- Tile loading (shared cache) ------------------------------------------

const cache = new Map<string, HTMLImageElement>()

export function loadTile(url: string): Promise<HTMLImageElement> {
  const hit = cache.get(url)
  if (hit && hit.complete) return Promise.resolve(hit)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      cache.set(url, img)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}
