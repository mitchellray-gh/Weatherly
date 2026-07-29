import { useEffect, useMemo, useRef, useState } from 'react'
import type { GeoLocation } from '../types'
import { fetchRadar, type RadarData } from '../lib/radar'
import './GeoRadar.css'

interface Props {
  location: GeoLocation
  active: boolean
}

/** Precip (mm/h) → geometric terrain colour: cool teal → cyan → white-hot. */
function heightColor(mm: number, a = 1): string {
  if (mm < 0.03) return `rgba(120, 150, 210, ${0.12 * a})`
  const t = Math.min(1, Math.log10(1 + mm) / Math.log10(1 + 14))
  // teal → sky → violet → hot white
  const stops: [number, [number, number, number]][] = [
    [0, [64, 196, 200]],
    [0.35, [90, 170, 255]],
    [0.6, [150, 140, 255]],
    [0.8, [235, 130, 220]],
    [1, [255, 245, 235]],
  ]
  let c = stops[0][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i]
    const [p1, c1] = stops[i + 1]
    if (t >= p0 && t <= p1) {
      const f = (t - p0) / (p1 - p0 || 1)
      c = [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ]
      break
    }
  }
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`
}

interface RainParticle {
  gx: number
  gy: number
  t: number // 0..1 fall progress
  speed: number
}

/**
 * An interactive 3-D topographic precipitation radar — a tilted wireframe
 * terrain where rainfall raises glowing peaks. Drag to fly around, scroll or
 * pinch to zoom, and drag the time scrubber to travel forward through the
 * storms. Rendered entirely on canvas as layered geometry.
 */
export function GeoRadar({ location, active }: Props) {
  const [data, setData] = useState<RadarData | null>(null)
  const [error, setError] = useState(false)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Camera state (mutable ref so the render loop reads live values).
  const cam = useRef({ yaw: 0.5, tilt: 1.02, zoom: 1, panX: 0, panY: 0 })
  const particles = useRef<RainParticle[]>([])
  const frameRef = useRef(0)
  const rafRef = useRef(0)

  frameRef.current = frame

  // Fetch a wider, denser grid than the classic radar card.
  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    setFrame(0)
    cam.current = { yaw: 0.5, tilt: 1.02, zoom: 1, panX: 0, panY: 0 }
    fetchRadar(location, { gridSize: 15, spanDeg: 1.1, days: 3 })
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [location])

  // Auto-advance the storm timeline while the scene is on screen.
  useEffect(() => {
    if (!playing || !data || !active) return
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % data.frames.length)
    }, 320)
    return () => window.clearInterval(id)
  }, [playing, data, active])

  const maxV = useMemo(() => Math.max(1.2, data?.maxValue ?? 1), [data])

  // Pointer drag → orbit / pan.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let dragging = false
    let lastX = 0
    let lastY = 0
    let pinchDist = 0

    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      if (e.shiftKey) {
        cam.current.panX += dx * 0.004
        cam.current.panY += dy * 0.004
      } else {
        cam.current.yaw += dx * 0.006
        cam.current.tilt = Math.max(0.5, Math.min(1.35, cam.current.tilt + dy * 0.004))
      }
    }
    const onUp = () => {
      dragging = false
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cam.current.zoom = Math.max(0.6, Math.min(3.2, cam.current.zoom * (e.deltaY < 0 ? 1.08 : 0.93)))
    }
    // Two-finger pinch zoom.
    const touchPts = new Map<number, { x: number; y: number }>()
    const onTDown = (e: PointerEvent) => {
      touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const onTMove = (e: PointerEvent) => {
      if (!touchPts.has(e.pointerId)) return
      touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touchPts.size === 2) {
        const [a, b] = [...touchPts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist) {
          cam.current.zoom = Math.max(0.6, Math.min(3.2, cam.current.zoom * (d / pinchDist)))
        }
        pinchDist = d
      }
    }
    const onTUp = (e: PointerEvent) => {
      touchPts.delete(e.pointerId)
      if (touchPts.size < 2) pinchDist = 0
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onTDown)
    el.addEventListener('pointermove', onTMove)
    window.addEventListener('pointerup', onTUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onTDown)
      el.removeEventListener('pointermove', onTMove)
      window.removeEventListener('pointerup', onTUp)
    }
  }, [])

  // The render loop — draws the wireframe terrain + rain every frame.
  useEffect(() => {
    if (!data) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const n = data.gridSize
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

    // Seed rain particles.
    if (particles.current.length === 0) {
      particles.current = Array.from({ length: 90 }, () => ({
        gx: Math.random() * (n - 1),
        gy: Math.random() * (n - 1),
        t: Math.random(),
        speed: 0.5 + Math.random() * 0.9,
      }))
    }

    // Smoothly interpolated precip lookup for a fractional grid point + frame.
    const sample = (gx: number, gy: number, fi: number): number => {
      const x0 = Math.max(0, Math.min(n - 1, Math.floor(gx)))
      const y0 = Math.max(0, Math.min(n - 1, Math.floor(gy)))
      const x1 = Math.min(n - 1, x0 + 1)
      const y1 = Math.min(n - 1, y0 + 1)
      const fx = gx - x0
      const fy = gy - y0
      const v = data.frames[fi].values
      const a = v[y0 * n + x0]
      const b = v[y0 * n + x1]
      const c = v[y1 * n + x0]
      const d = v[y1 * n + x1]
      return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
    }

    let running = true
    const draw = () => {
      if (!running) return
      const rect = canvas.getBoundingClientRect()
      const W = Math.max(1, Math.round(rect.width * dpr))
      const H = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }
      ctx.clearRect(0, 0, W, H)

      const t0 = performance.now() / 1000
      const { yaw, tilt, zoom, panX, panY } = cam.current
      const fi = frameRef.current
      const cx = W / 2
      const cy = H * 0.56
      const spread = Math.min(W, H) * 0.62 * zoom
      const elevH = Math.min(W, H) * 0.26

      const cosT = Math.cos(tilt)
      const sinT = Math.sin(tilt)
      const cosY = Math.cos(yaw)
      const sinY = Math.sin(yaw)

      // Project a grid vertex (col c, row r) to screen space.
      const project = (c: number, r: number, h: number) => {
        let wx = (c / (n - 1) - 0.5) * 2 + panX
        let wy = (r / (n - 1) - 0.5) * 2 + panY
        // yaw around vertical
        const rx = wx * cosY - wy * sinY
        const rz0 = wx * sinY + wy * cosY
        wx = rx
        wy = rz0
        // tilt around X, elevation lifts toward camera
        const ry = wy * cosT - h * sinT
        const depth = wy * sinT + h * cosT
        const persp = 2.4 / (2.4 + depth)
        return {
          x: cx + wx * spread * persp,
          y: cy + ry * spread * persp - h * elevH * persp * 0.0,
          persp,
          depth,
        }
      }

      const hAt = (c: number, r: number) => {
        const v = data.frames[fi].values[r * n + c]
        return Math.min(1, Math.log10(1 + v) / Math.log10(1 + maxV)) * (elevH / spread) * 3.2
      }

      // Always-present rolling "topography" so the map reads as 3-D terrain even
      // when it's completely dry — gentle layered sine hills drifting over time.
      const unit = elevH / spread
      const drift = t0 * 0.06
      const baseH = (c: number, r: number) => {
        const u = c / (n - 1)
        const w = r / (n - 1)
        const a = Math.sin(u * 6.2 + drift) * Math.cos(w * 5.1 - drift * 0.7)
        const b = Math.sin((u + w) * 4.3 + drift * 1.3)
        return (a * 0.5 + b * 0.5) * unit * 0.55 + unit * 0.35
      }
      const surfH = (c: number, r: number) => baseH(c, r) + hAt(c, r)

      // ---- Ground shadow grid (flat, faint) for depth reference ----
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(150, 175, 220, 0.08)'
      for (let r = 0; r < n; r += 3) {
        ctx.beginPath()
        for (let c = 0; c < n; c++) {
          const p = project(c, r, 0)
          c === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      for (let c = 0; c < n; c += 3) {
        ctx.beginPath()
        for (let r = 0; r < n; r++) {
          const p = project(c, r, 0)
          r === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }

      // ---- The topographic surface — always visible relief; precip glows ----
      for (let r = 0; r < n - 1; r++) {
        for (let c = 0; c < n - 1; c++) {
          const v = data.frames[fi].values[r * n + c]
          const h00 = surfH(c, r)
          const p00 = project(c, r, h00)
          const p10 = project(c + 1, r, surfH(c + 1, r))
          const p11 = project(c + 1, r + 1, surfH(c + 1, r + 1))
          const p01 = project(c, r + 1, surfH(c, r + 1))
          const lift = Math.min(1, Math.log10(1 + v) / Math.log10(1 + maxV))
          // Base relief shading by height so the terrain always reads in 3-D.
          const relief = Math.max(0, Math.min(1, (h00 / unit) * 0.5 + 0.2))
          ctx.beginPath()
          ctx.moveTo(p00.x, p00.y)
          ctx.lineTo(p10.x, p10.y)
          ctx.lineTo(p11.x, p11.y)
          ctx.lineTo(p01.x, p01.y)
          ctx.closePath()
          if (v > 0.03) {
            ctx.fillStyle = heightColor(v, 0.3 + lift * 0.55)
            ctx.fill()
            ctx.strokeStyle = heightColor(v, 0.55 + lift * 0.45)
            ctx.lineWidth = 1 + lift * 1.8
            ctx.stroke()
          } else {
            ctx.fillStyle = `rgba(90, 130, 200, ${0.05 + relief * 0.16})`
            ctx.fill()
            ctx.strokeStyle = `rgba(150, 185, 235, ${0.12 + relief * 0.22})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // ---- Rain particles falling into wet cells ----
      for (const pt of particles.current) {
        const wet = sample(pt.gx, pt.gy, fi)
        pt.t += 0.016 * pt.speed * (wet > 0.05 ? 1.6 : 0.5)
        if (pt.t > 1) {
          pt.t = 0
          pt.gx = Math.random() * (n - 1)
          pt.gy = Math.random() * (n - 1)
        }
        if (wet < 0.05) continue
        const ground = surfH(Math.round(pt.gx), Math.round(pt.gy))
        const top = ground + 0.6
        const h = top + (ground - top) * pt.t
        const p = project(pt.gx, pt.gy, h)
        const p2 = project(pt.gx, pt.gy, h + 0.12)
        const a = 0.5 * (1 - pt.t) + 0.2
        ctx.strokeStyle = heightColor(wet, a)
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(p2.x, p2.y)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }

      // ---- Storm core pulses at the strongest cells ----
      let peakV = 0
      let peakC = 0
      let peakR = 0
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const v = data.frames[fi].values[r * n + c]
          if (v > peakV) {
            peakV = v
            peakC = c
            peakR = r
          }
        }
      }
      if (peakV > 0.2) {
        const p = project(peakC, peakR, surfH(peakC, peakR))
        const pulse = 0.5 + 0.5 * Math.sin(t0 * 3)
        const rad = (8 + pulse * 10) * p.persp * dpr
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad)
        grad.addColorStop(0, heightColor(peakV, 0.5))
        grad.addColorStop(1, heightColor(peakV, 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
        ctx.fill()
      }

      // ---- Center location marker ----
      const cm = Math.floor((n - 1) / 2)
      const cP = project((n - 1) / 2, (n - 1) / 2, surfH(cm, cm) + 0.25)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 1.4 * dpr
      const ms = 5 * dpr
      ctx.beginPath()
      ctx.moveTo(cP.x - ms, cP.y)
      ctx.lineTo(cP.x + ms, cP.y)
      ctx.moveTo(cP.x, cP.y - ms)
      ctx.lineTo(cP.x, cP.y + ms)
      ctx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [data, maxV])

  const frameLabel = useMemo(() => {
    if (!data) return ''
    const t = data.frames[frame]?.time
    if (!t) return ''
    const d = new Date(t)
    const now = new Date()
    const dd = Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
    const hr = d.toLocaleTimeString([], { hour: 'numeric' })
    const rel = Math.round((d.getTime() - now.getTime()) / 3600000)
    const day = dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' })
    return `${day} ${hr} · +${rel}h`
  }, [data, frame])

  const wetNow = useMemo(() => {
    if (!data) return false
    return data.frames[frame]?.values.some((v) => v > 0.1)
  }, [data, frame])

  return (
    <section className="gj-scene gj-radar" data-i={6}>
      <div className="gj-chapter">Storms</div>
      <div className="gjr-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="gjr-canvas" />
        {!data && !error && <div className="gjr-status">Charting the skies…</div>}
        {error && <div className="gjr-status">Radar unavailable right now.</div>}
        {data && (
          <div className="gjr-badge">{wetNow ? '🌧 Precipitation in view' : '☀ Clear across the region'}</div>
        )}
      </div>

      {data && (
        <div className="gjr-controls">
          <button
            className="gjr-play"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <input
            className="gjr-scrub"
            type="range"
            min={0}
            max={data.frames.length - 1}
            value={frame}
            onChange={(e) => {
              setPlaying(false)
              setFrame(Number(e.target.value))
            }}
            aria-label="Storm timeline"
          />
          <span className="gjr-time">{frameLabel}</span>
        </div>
      )}
      <div className="gj-hint">Drag to fly · scroll to zoom · scrub time to chase the storm</div>
      <div className="gj-end">— end of the journey —</div>
    </section>
  )
}
