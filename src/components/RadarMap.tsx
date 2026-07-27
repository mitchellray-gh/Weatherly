import { useEffect, useMemo, useRef, useState } from 'react'
import type { GeoLocation } from '../types'
import { fetchRadar, radarColor, type RadarData } from '../lib/radar'
import './RadarMap.css'

interface Props {
  location: GeoLocation
}

const BUF = 72 // interpolation buffer resolution (BUF x BUF)

function bilinear(data: RadarData, frameIdx: number, gx: number, gy: number): number {
  // gx, gy are fractional grid coordinates in [0, gridSize-1].
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

export function RadarMap({ location }: Props) {
  const [data, setData] = useState<RadarData | null>(null)
  const [error, setError] = useState(false)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    setFrame(0)
    setPlaying(false)
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
    for (let py = 0; py < BUF; py++) {
      for (let px = 0; px < BUF; px++) {
        const gx = (px / (BUF - 1)) * (n - 1)
        const gy = (py / (BUF - 1)) * (n - 1)
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

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(buf, 0, 0, w, h)

    // Range rings + crosshair for a radar feel.
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    const cx = w / 2
    const cy = h / 2
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath()
      ctx.arc(cx, cy, (Math.min(w, h) / 2) * (r / 3), 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, h)
    ctx.moveTo(0, cy)
    ctx.lineTo(w, cy)
    ctx.stroke()

    // Center marker.
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }, [data, frame])

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

  return (
    <section className="radar glass">
      <div className="radar-head">
        <h2 className="section-title" style={{ margin: 0 }}>
          Precipitation Radar
        </h2>
        <span className="radar-frame-label">{frameLabel}</span>
      </div>

      <div className="radar-stage">
        <canvas ref={canvasRef} width={320} height={320} className="radar-canvas" />
        {!data && <div className="radar-loading">Loading radar…</div>}
        <div className="radar-scalebar">~120 km across</div>
      </div>

      <div className="radar-controls">
        <button
          className="radar-play"
          onClick={() => setPlaying((p) => !p)}
          disabled={!data}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          className="radar-slider"
          min={0}
          max={data ? data.frames.length - 1 : 0}
          value={frame}
          onChange={(e) => {
            setPlaying(false)
            setFrame(+e.target.value)
          }}
          disabled={!data}
          aria-label="Radar time"
        />
      </div>

      <div className="radar-legend">
        <span className="radar-legend-label">Light</span>
        <span className="radar-legend-bar" />
        <span className="radar-legend-label">Heavy</span>
      </div>
      <p className="radar-note">Forecast precipitation for your area, out to 7 days.</p>
    </section>
  )
}
