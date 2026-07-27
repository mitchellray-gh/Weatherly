// Web-Mercator raster basemap tiles (CARTO dark, CORS-enabled) for the radar.

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

const SUBS = ['a', 'b', 'c', 'd']

/**
 * Compute the CARTO dark basemap tiles that cover the given bbox, positioned
 * for a canvas of size W×H whose x-axis maps linearly west→east and y-axis
 * top→bottom north→south.
 */
export function computeBasemap(
  west: number,
  east: number,
  north: number,
  south: number,
  W: number,
  H: number,
): Basemap {
  const fraction = (east - west) / 360
  // Aim for ~3 tiles across the view; clamp to a sensible zoom range.
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
  let s = 0
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      const wx = ((tx % worldTiles) + worldTiles) % worldTiles
      const sub = SUBS[s++ % SUBS.length]
      tiles.push({
        url: `https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${wx}/${ty}.png`,
        dx: ((tx * 256 - pxWest) / spanX) * W,
        dy: ((ty * 256 - pxNorth) / spanY) * H,
        dw: (256 / spanX) * W,
        dh: (256 / spanY) * H,
      })
    }
  }
  return { z, tiles }
}

const cache = new Map<string, HTMLImageElement>()

/** Load a tile image (crossOrigin so it can be drawn to a canvas). */
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
