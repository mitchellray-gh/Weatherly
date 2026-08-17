import { useEffect, useMemo, useRef, useState } from 'react'
import type { GeoLocation, WeatherLayerId } from '../types'
import type { BasemapStyleId, OverlayId } from '../lib/basemap'
import { computeBasemap, computeOverlay, loadTile, type BasemapTile } from '../lib/basemap'
import { fetchRadar, radarColor, type RadarData } from '../lib/radar'
import {
  fetchWeatherGrid,
  bilinearGrid,
  layerColor,
  drawWindArrow,
  type WeatherGridData,
} from '../lib/weatherLayers'
import { MEASURABLE_MM } from '../lib/precip'
import { MapLayers } from './MapLayers'
import { LayerLegend } from './LayerLegend'
import './RadarMap.css'

interface Props {
  location: GeoLocation
  onOpenDetail?: () => void
}

const BUF = 72

interface LoadedTile extends BasemapTile {
  img: HTMLImageElement
}

function bilinear(data: RadarData, frameIdx: number, gx: number, gy: number): number {
  const n = data.gridSize
  const x0 = Math.max(0, Math.min(n - 1, Math.floor(gx)))
  const y0 = Math.max(0, Math.min(n - 1, Math.floor(gy)))
  const x1 = Math.min(n - 1, x0 + 1)
  const y1 = Math.min(n - 1, y0 + 1)
  const fx = gx - x0
  const fy = gy - y0
  const v = data.frames[frameIdx].values
  const v00 = v[y0 * n + x0]
  const v10 = v[y0 * n + x1]
  const v01 = v[y1 * n + x0]
  const v11 = v[y1 * n + x1]
  const top = v00 + (v10 - v00) * fx
  const bot = v01 + (v11 - v01) * fx
  return top + (bot - top) * fy
}

export function RadarMap({ location, onOpenDetail }: Props) {
  const [data, setData] = useState<RadarData | null>(null)
  const [error, setError] = useState(false)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [tiles, setTiles] = useState<LoadedTile[]>([])

  // Layer state
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>('carto')
  const [overlays, setOverlays] = useState<OverlayId[]>([])
  const [overlayTiles, setOverlayTiles] = useState<LoadedTile[]>([])
  const [weatherLayer, setWeatherLayer] = useState<WeatherLayerId | null>(null)
  const [weatherOpacity, setWeatherOpacity] = useState(0.6)
  const [weatherData, setWeatherData] = useState<WeatherGridData | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<HTMLCanvasElement | null>(null)

  const RES = Math.round(320 * Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1))

  const bbox = useMemo(() => {
    if (!data) return null
    const frac = 1 / zoom
    const { lat, lon } = data.center
    const west = lon - (lon - data.lons[0]) * frac
    const east = lon + (data.lons[data.lons.length - 1] - lon) * frac
    const north = lat + (data.lats[0] - lat) * frac
    const south = lat - (lat - data.lats[data.lats.length - 1]) * frac
    return { west, east, north, south }
  }, [data, zoom])

  // Reset state on location change.
  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    setFrame(0)
    setPlaying(false)
    setExpanded(false)
    setZoom(1)
    setTiles([])
    setOverlayTiles([])
    setWeatherData(null)
    fetchRadar(location, { gridSize: 11, spanDeg: 0.55, days: 7 })
      .then((d) => {
        if (alive) setData(d)
      })
      .catch(() => {
        if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [location])

  // Load basemap tiles for the selected style.
  useEffect(() => {
    if (!data || !bbox) return
    let alive = true
    const { tiles: specs } = computeBasemap(bbox.west, bbox.east, bbox.north, bbox.south, RES, RES, basemapStyle)
    Promise.all(
      specs.map((s) =>
        loadTile(s.url)
          .then((img) => ({ ...s, img }) as LoadedTile)
          .catch(() => null),
      ),
    ).then((loaded) => {
      if (alive) setTiles(loaded.filter((t): t is LoadedTile => t !== null))
    })
    return () => {
      alive = false
    }
  }, [data, bbox, RES, basemapStyle])

  // Load overlay tiles.
  useEffect(() => {
    if (!data || !bbox || overlays.length === 0) {
      setOverlayTiles([])
      return
    }
    let alive = true
    // Use the first enabled overlay (could extend to support multiple).
    const overlayId = overlays[0]
    const { tiles: specs } = computeOverlay(bbox.west, bbox.east, bbox.north, bbox.south, RES, RES, overlayId)
    Promise.all(
      specs.map((s) =>
        loadTile(s.url)
          .then((img) => ({ ...s, img }) as LoadedTile)
          .catch(() => null),
      ),
    ).then((loaded) => {
      if (alive) setOverlayTiles(loaded.filter((t): t is LoadedTile => t !== null))
    })
    return () => {
      alive = false
    }
  }, [data, bbox, RES, overlays])

  // Fetch weather grid data.
  useEffect(() => {
    if (!data || !weatherLayer) {
      setWeatherData(null)
      return
    }
    let alive = true
    fetchWeatherGrid(location, weatherLayer, { gridSize: 15, spanDeg: 0.65, days: 3 })
      .then((d) => {
        if (alive) setWeatherData(d)
      })
      .catch(() => {
        if (alive) setWeatherData(null)
      })
    return () => {
      alive = false
    }
  }, [location, weatherLayer])

  // Playback loop.
  useEffect(() => {
    if (!playing || !data) return
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % data.frames.length)
    }, 200)
    return () => window.clearInterval(id)
  }, [playing, data])

  // Draw the current frame.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Render precipitation into a small offscreen buffer, then upscale smoothly.
    if (!bufRef.current) bufRef.current = document.createElement('canvas')
    const buf = bufRef.current
    buf.width = BUF
    buf.height = BUF
    const bctx = buf.getContext('2d')!
    const img = bctx.createImageData(BUF, BUF)
    const n = data.gridSize
    const frac = 1 / zoom
    const gCenter = (n - 1) / 2
    const gHalf = ((n - 1) / 2) * frac
    for (let py = 0; py < BUF; py++) {
      for (let px = 0; px < BUF; px++) {
        const gx = gCenter - gHalf + (px / (BUF - 1)) * (2 * gHalf)
        const gy = gCenter - gHalf + (py / (BUF - 1)) * (2 * gHalf)
        const mm = bilinear(data, frame, gx, gy)
        const rgba = radarColor(mm)
        const m = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(rgba)
        const idx = (py * BUF + px) * 4
        if (m) {
          img.data[idx] = +m[1]
          img.data[idx + 1] = +m[2]
          img.data[idx + 2] = +m[3]
          img.data[idx + 3] = Math.round(parseFloat(m[4]) * 255)
        } else {
          img.data[idx + 3] = 0
        }
      }
    }
    bctx.putImageData(img, 0, 0)

    // Size the backing store for crisp (retina) rendering.
    if (canvas.width !== RES) canvas.width = RES
    if (canvas.height !== RES) canvas.height = RES
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Layer 1: Basemap tiles.
    if (tiles.length > 0) {
      for (const t of tiles) {
        try {
          ctx.drawImage(t.img, t.dx, t.dy, t.dw, t.dh)
        } catch {
          /* tainted/failed tile — skip */
        }
      }
    }

    // Layer 2: Overlay tiles (hillshade/contours).
    if (overlayTiles.length > 0) {
      ctx.globalAlpha = 0.35
      for (const t of overlayTiles) {
        try {
          ctx.drawImage(t.img, t.dx, t.dy, t.dw, t.dh)
        } catch {
          /* skip */
        }
      }
      ctx.globalAlpha = 1
    }

    // Layer 3: Weather overlay (wind, temperature, etc.).
    if (weatherData && weatherLayer) {
      ctx.globalAlpha = weatherOpacity
      const wN = weatherData.gridSize
      const wFrac = 1 / zoom
      const wCenter = (wN - 1) / 2
      const wHalf = ((wN - 1) / 2) * wFrac
      const cellW = w / BUF
      const cellH = h / BUF
      const step = weatherLayer === 'wind' ? 6 : 4
      if (weatherLayer === 'wind') {
        // Draw wind arrows on a grid.
        for (let py = 0; py < BUF; py += step) {
          for (let px = 0; px < BUF; px += step) {
            const gx = wCenter - wHalf + (px / (BUF - 1)) * (2 * wHalf)
            const gy = wCenter - wHalf + (py / (BUF - 1)) * (2 * wHalf)
            const speed = bilinearGrid(weatherData, frame, gx, gy)
            const dir = bilinearGrid(weatherData, frame, gx, gy, true)
            drawWindArrow(ctx, px * cellW + cellW / 2, py * cellH + cellH / 2, speed, dir, cellW * step * 0.75, weatherOpacity)
          }
        }
      } else {
        // Color ramp overlay: render into a small buffer and upscale.
        if (!bufRef.current) bufRef.current = document.createElement('canvas')
        const wbuf = document.createElement('canvas')
        wbuf.width = BUF
        wbuf.height = BUF
        const wctx = wbuf.getContext('2d')!
        const wimg = wctx.createImageData(BUF, BUF)
        for (let py = 0; py < BUF; py++) {
          for (let px = 0; px < BUF; px++) {
            const gx = wCenter - wHalf + (px / (BUF - 1)) * (2 * wHalf)
            const gy = wCenter - wHalf + (py / (BUF - 1)) * (2 * wHalf)
            const val = bilinearGrid(weatherData, frame, gx, gy)
            const rgba = layerColor(weatherLayer, val, 0.8)
            const m = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(rgba)
            const idx = (py * BUF + px) * 4
            if (m) {
              wimg.data[idx] = +m[1]
              wimg.data[idx + 1] = +m[2]
              wimg.data[idx + 2] = +m[3]
              wimg.data[idx + 3] = Math.round(parseFloat(m[4]) * 255)
            } else {
              wimg.data[idx + 3] = 0
            }
          }
        }
        wctx.putImageData(wimg, 0, 0)
        ctx.drawImage(wbuf, 0, 0, w, h)
      }
      ctx.globalAlpha = 1
    }

    // Layer 4: Precipitation overlay.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.globalAlpha = 0.72
    ctx.drawImage(buf, 0, 0, w, h)
    ctx.globalAlpha = 1

    // Subtle range rings.
    const cx = w / 2
    const cy = h / 2
    const scale = w / 320
    ctx.strokeStyle = 'rgba(20,30,50,0.14)'
    ctx.lineWidth = 1 * scale
    for (let r = 1; r <= 2; r++) {
      ctx.beginPath()
      ctx.arc(cx, cy, (Math.min(w, h) / 2) * (r / 2.2), 0, Math.PI * 2)
      ctx.stroke()
    }

    // "You are here" marker.
    ctx.beginPath()
    ctx.arc(cx, cy, 11 * scale, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, 6 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#2f7fe0'
    ctx.fill()
    ctx.lineWidth = 2.5 * scale
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }, [data, frame, tiles, overlayTiles, weatherData, weatherLayer, weatherOpacity, expanded, zoom, RES])

  const frameLabel = useMemo(() => {
    if (!data) return ''
    const t = new Date(data.frames[frame]?.time ?? Date.now())
    const now = Date.now()
    const diffH = Math.round((t.getTime() - now) / 3600000)
    const rel =
      diffH <= 0 ? 'now' : diffH < 24 ? `+${diffH}h` : `+${Math.round(diffH / 24)}d`
    return `${t.toLocaleDateString([], { weekday: 'short' })} ${t.toLocaleTimeString([], {
      hour: 'numeric',
    })} · ${rel}`
  }, [data, frame])

  const frameCoverage = useMemo(() => {
    if (!data) return 0
    const vals = data.frames[frame]?.values ?? []
    if (vals.length === 0) return 0
    const wet = vals.filter((v) => v >= MEASURABLE_MM).length
    return wet / vals.length
  }, [data, frame])

  const dryEverywhere = data != null && data.maxValue < MEASURABLE_MM

  const nextRain = useMemo(() => {
    if (!data) return null
    const now = Date.now()
    for (let i = 0; i < data.frames.length; i++) {
      const f = data.frames[i]
      if (new Date(f.time).getTime() < now - 60 * 60 * 1000) continue
      if (f.values.some((v) => v >= MEASURABLE_MM)) return { idx: i, time: new Date(f.time) }
    }
    return null
  }, [data])

  const hoursUntilRain = nextRain ? (nextRain.time.getTime() - Date.now()) / 3600000 : Infinity
  const rainSoon = hoursUntilRain <= 10

  useEffect(() => {
    if (!data) return
    if (rainSoon && nextRain) {
      setExpanded(true)
      setFrame(nextRain.idx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  function jumpToRain() {
    if (!data || !nextRain) return
    setExpanded(true)
    setPlaying(false)
    setFrame(nextRain.idx)
  }

  function nextRainLabel(): string {
    if (!nextRain) return ''
    const h = hoursUntilRain
    const when =
      h <= 0
        ? 'now'
        : h < 1
          ? `in ${Math.round(h * 60)} min`
          : h < 24
            ? `in ${Math.round(h)} hr${Math.round(h) === 1 ? '' : 's'}`
            : `in ${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? '' : 's'}`
    const abs =
      h < 24
        ? nextRain.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : `${nextRain.time.toLocaleDateString([], { weekday: 'long' })} ${nextRain.time.toLocaleTimeString([], { hour: 'numeric' })}`
    return `${when} · ${abs}`
  }

  const attribution = useMemo(() => {
    const base = basemapStyle === 'carto' || basemapStyle === 'dark'
      ? '© OpenStreetMap contributors, © CARTO'
      : basemapStyle === 'topo'
        ? '© OpenMapTiles, © OpenStreetMap'
        : basemapStyle === 'satellite'
          ? '© Esri, Maxar'
          : '© Esri, USGS'
    return weatherLayer ? `${base} · Data by Open-Meteo` : base
  }, [basemapStyle, weatherLayer])

  if (error) {
    return (
      <section className="radar glass">
        <h2 className="section-title" style={{ margin: '0 0 8px' }}>
          Precipitation Radar
        </h2>
        <p className="radar-empty">Radar is unavailable for this location right now.</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="radar glass">
        <h2 className="section-title" style={{ margin: '0 0 8px' }}>
          Precipitation Radar
        </h2>
        <p className="radar-empty">Loading radar…</p>
      </section>
    )
  }

  if (dryEverywhere && !weatherLayer) {
    return (
      <section className="radar glass">
        <div className="radar-collapsed">
          <span className="radar-collapsed-icon">☀️</span>
          <div>
            <div className="radar-collapsed-title">No precipitation expected</div>
            <div className="radar-collapsed-sub">Nothing on radar for the next 7 days</div>
          </div>
        </div>
      </section>
    )
  }

  if (!expanded && !weatherLayer) {
    return (
      <section className="radar glass">
        <button className="radar-collapsed radar-collapsed-btn" onClick={jumpToRain}>
          <span className="radar-collapsed-icon">🌧️</span>
          <div>
            <div className="radar-collapsed-title">Next rain {nextRainLabel()}</div>
            <div className="radar-collapsed-sub">Tap to open the radar map →</div>
          </div>
        </button>
      </section>
    )
  }

  return (
    <section className="radar glass">
      <div className="radar-head">
        <h2 className="section-title" style={{ margin: 0 }}>
          {weatherLayer ? 'Weather Map' : 'Precipitation Radar'}
        </h2>
        <div className="radar-head-controls">
          <span className="radar-frame-label">{frameLabel}</span>
          <MapLayers
            basemap={basemapStyle}
            onBasemapChange={setBasemapStyle}
            overlays={overlays}
            onOverlaysChange={setOverlays}
            weatherLayer={weatherLayer}
            onWeatherLayerChange={setWeatherLayer}
            weatherOpacity={weatherOpacity}
            onWeatherOpacityChange={setWeatherOpacity}
          />
        </div>
      </div>

      <div className="radar-stage">
        <canvas ref={canvasRef} width={320} height={320} className="radar-canvas" />
        <div className="radar-coverage">
          {frameCoverage > 0 ? `${Math.round(frameCoverage * 100)}% of area` : 'Dry now'}
        </div>
        <div className="radar-zoom">
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 1))}
            disabled={zoom >= 4}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 1))}
            disabled={zoom <= 1}
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
        <div className="radar-scalebar">~{Math.round(120 / zoom)} km across</div>
        <div className="radar-attribution">{attribution}</div>
      </div>

      <div className="radar-controls">
        <button
          className="radar-play"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          className="radar-slider"
          min={0}
          max={data.frames.length - 1}
          value={frame}
          onChange={(e) => {
            setPlaying(false)
            setFrame(+e.target.value)
          }}
          aria-label="Radar time"
        />
      </div>

      <LayerLegend layer={weatherLayer} />

      <div className="radar-footer">
        <button className="radar-jump" onClick={jumpToRain}>
          Jump to next precipitation →
        </button>
        {onOpenDetail && (
          <button className="radar-hide" onClick={onOpenDetail}>
            Rain timeline
          </button>
        )}
        {!rainSoon && (
          <button className="radar-hide" onClick={() => setExpanded(false)}>
            Hide map
          </button>
        )}
      </div>
    </section>
  )
}
