import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisasterEvent, DisasterType } from '../types'
import {
  fetchDisasters,
  DISASTER_TYPE_LABELS,
  DISASTER_TYPE_ICONS,
  DISASTER_TYPE_COLORS,
} from '../lib/disasters'
import { computeBasemap, loadTile, type BasemapTile } from '../lib/basemap'
import './DisastersSheet.css'

interface Props {
  open: boolean
  onClose: () => void
}

const ALL_TYPES: DisasterType[] = [
  'earthquake', 'wildfire', 'volcano', 'flood', 'cyclone', 'drought', 'storm', 'other',
]

const DAY_OPTIONS = [1, 3, 5, 7, 14, 30]

const MAP_H = 240

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface LoadedTile extends BasemapTile {
  img: HTMLImageElement
}

export function DisastersSheet({ open, onClose }: Props) {
  const [events, setEvents] = useState<DisasterEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTypes, setActiveTypes] = useState<Set<DisasterType>>(new Set())
  const [daysFilter, setDaysFilter] = useState(5)
  const [selected, setSelected] = useState<DisasterEvent | null>(null)

  // Map state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tiles, setTiles] = useState<LoadedTile[]>([])
  const viewRef = useRef({ centerLng: 0, centerLat: 20, zoom: 1.8 })
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 })
  const dragMoved = useRef(false)

  // Fetch data on open
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchDisasters().then((evts) => {
      if (!cancelled) {
        setEvents(evts)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [open])

  const cutoff = Date.now() - daysFilter * 86400000
  const filtered = events.filter((e) => {
    if (activeTypes.size > 0 && !activeTypes.has(e.type)) return false
    if (new Date(e.date).getTime() < cutoff) return false
    return true
  })

  const toggleType = (t: DisasterType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  // ---- Load tiles when view changes ----------------------------------------

  const loadTiles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.clientWidth || 400
    const H = MAP_H
    const v = viewRef.current
    const halfFov = 180 / v.zoom
    const west = v.centerLng - halfFov
    const east = v.centerLng + halfFov
    const latHalf = 80 / v.zoom
    const north = Math.min(85, v.centerLat + latHalf)
    const south = Math.max(-85, v.centerLat - latHalf)

    const { tiles: specs } = computeBasemap(west, east, north, south, W, H, 'dark')
    Promise.all(
      specs.map((s) =>
        loadTile(s.url)
          .then((img) => ({ ...s, img }) as LoadedTile)
          .catch(() => null),
      ),
    ).then((loaded) => setTiles(loaded.filter((t): t is LoadedTile => t !== null)))
  }, [])

  // Initial load + re-load on filter change
  useEffect(() => {
    if (open) requestAnimationFrame(loadTiles)
  }, [open, filtered, loadTiles])

  // ---- Draw ----------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || tiles.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth
    const H = MAP_H
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const v = viewRef.current
    const halfFov = 180 / v.zoom
    const west = v.centerLng - halfFov
    const east = v.centerLng + halfFov
    const latHalf = 80 / v.zoom
    const north = Math.min(85, v.centerLat + latHalf)
    const south = Math.max(-85, v.centerLat - latHalf)

    // Draw tiles
    for (const t of tiles) {
      ctx.drawImage(t.img, t.dx, t.dy, t.dw, t.dh)
    }

    // Project helper
    const project = (lng: number, lat: number): [number, number] => {
      const x = ((lng - west) / (east - west)) * W
      const r = (lat * Math.PI) / 180
      const mercY = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2
      const northR = (north * Math.PI) / 180
      const southR = (south * Math.PI) / 180
      const northMerc = (1 - Math.log(Math.tan(northR) + 1 / Math.cos(northR)) / Math.PI) / 2
      const southMerc = (1 - Math.log(Math.tan(southR) + 1 / Math.cos(southR)) / Math.PI) / 2
      const y = ((mercY - northMerc) / (southMerc - northMerc)) * H
      return [x, y]
    }

    // Draw pins
    const pinR = Math.max(4, Math.min(10, 6 / v.zoom * 2))
    for (const ev of filtered) {
      if (ev.lat < south || ev.lat > north || ev.lng < west || ev.lng > east) continue
      const [px, py] = project(ev.lng, ev.lat)
      const color = DISASTER_TYPE_COLORS[ev.type]

      ctx.beginPath()
      ctx.arc(px, py, pinR + 4, 0, Math.PI * 2)
      ctx.fillStyle = color + '30'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(px, py, pinR, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      if (ev.type === 'earthquake' && ev.magnitude) {
        const ringR = pinR + 2 + Math.min(ev.magnitude * 1.5, 12)
        ctx.beginPath()
        ctx.arc(px, py, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = color + '60'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }, [tiles, filtered])

  // ---- Pan/zoom handlers ---------------------------------------------------

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY }
    dragMoved.current = false
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.dragging) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dx = e.clientX - d.lastX
    const dy = e.clientY - d.lastY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
    d.lastX = e.clientX
    d.lastY = e.clientY

    const v = viewRef.current
    const halfFov = 180 / v.zoom
    const pixelsPerDegLng = rect.width / (halfFov * 2)
    v.centerLng -= dx / pixelsPerDegLng

    const latRange = 160 / v.zoom
    v.centerLat += (dy / rect.height) * latRange
    v.centerLat = Math.max(-80, Math.min(80, v.centerLat))

    loadTiles()
  }

  const handlePointerUp = () => {
    dragRef.current.dragging = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const v = viewRef.current
    const factor = e.deltaY > 0 ? 0.85 : 1.18
    v.zoom = Math.max(1, Math.min(12, v.zoom * factor))
    loadTiles()
  }

  const handleClick = (e: React.MouseEvent) => {
    if (dragMoved.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const v = viewRef.current

    const halfFov = 180 / v.zoom
    const west = v.centerLng - halfFov
    const east = v.centerLng + halfFov
    const latHalf = 80 / v.zoom
    const north = Math.min(85, v.centerLat + latHalf)
    const south = Math.max(-85, v.centerLat - latHalf)

    let best: DisasterEvent | null = null
    let bestDist = 20

    for (const ev of filtered) {
      if (ev.lat < south || ev.lat > north || ev.lng < west || ev.lng > east) continue
      const px = ((ev.lng - west) / (east - west)) * rect.width
      const r = (ev.lat * Math.PI) / 180
      const mercY = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2
      const northR = (north * Math.PI) / 180
      const southR = (south * Math.PI) / 180
      const northMerc = (1 - Math.log(Math.tan(northR) + 1 / Math.cos(northR)) / Math.PI) / 2
      const southMerc = (1 - Math.log(Math.tan(southR) + 1 / Math.cos(southR)) / Math.PI) / 2
      const py = ((mercY - northMerc) / (southMerc - northMerc)) * rect.height
      const dist = Math.hypot(px - mx, py - my)
      if (dist < bestDist) {
        bestDist = dist
        best = ev
      }
    }
    if (best) setSelected(best)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ds-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="ds-sheet glass"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Natural Disasters"
          >
            <div className="ds-grip" />
            <div className="ds-head">
              <h2>Natural Disasters</h2>
              <button className="ds-close" onClick={onClose} aria-label="Close">
                Done
              </button>
            </div>

            <div className="ds-filters">
              <button
                className={`ds-chip ${activeTypes.size === 0 ? 'active' : ''}`}
                onClick={() => setActiveTypes(new Set())}
              >
                All
              </button>
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  className={`ds-chip ${activeTypes.has(t) ? 'active' : ''}`}
                  onClick={() => toggleType(t)}
                >
                  {DISASTER_TYPE_ICONS[t]} {DISASTER_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="ds-days">
              <span className="ds-days-label">Past</span>
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  className={`ds-days-btn ${daysFilter === d ? 'active' : ''}`}
                  onClick={() => setDaysFilter(d)}
                >
                  {d}d
                </button>
              ))}
            </div>

            <div className="ds-map-wrap">
              <canvas
                ref={canvasRef}
                className="ds-map"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onWheel={handleWheel}
                onClick={handleClick}
              />
              {loading && (
                <div className="ds-map-loading">Loading disaster data…</div>
              )}
              <div className="ds-map-count">
                {filtered.length} event{filtered.length !== 1 ? 's' : ''} · past {daysFilter} day{daysFilter !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="ds-list">
              {filtered.length === 0 && !loading && (
                <div className="ds-empty">No events found for the selected filters.</div>
              )}
              {filtered.map((ev) => (
                <button
                  key={ev.id}
                  className="ds-card"
                  onClick={() => setSelected(ev)}
                >
                  <span
                    className="ds-card-dot"
                    style={{ background: DISASTER_TYPE_COLORS[ev.type] }}
                  />
                  <div className="ds-card-body">
                    <div className="ds-card-title">{ev.title}</div>
                    <div className="ds-card-meta">
                      {DISASTER_TYPE_LABELS[ev.type]}
                      {ev.severity ? ` · ${ev.severity}` : ''}
                      {' · '}
                      {timeAgo(ev.date)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence>
            {selected && (
              <motion.div
                className="ds-detail-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelected(null)}
              >
                <motion.div
                  className="ds-detail glass"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="ds-detail-head">
                    <span
                      className="ds-detail-icon"
                      style={{ background: DISASTER_TYPE_COLORS[selected.type] }}
                    >
                      {DISASTER_TYPE_ICONS[selected.type]}
                    </span>
                    <div>
                      <div className="ds-detail-type">{DISASTER_TYPE_LABELS[selected.type]}</div>
                      <div className="ds-detail-title">{selected.title}</div>
                    </div>
                  </div>
                  <div className="ds-detail-info">
                    <div className="ds-detail-row">
                      <span className="ds-detail-label">Date</span>
                      <span>{new Date(selected.date).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}</span>
                    </div>
                    <div className="ds-detail-row">
                      <span className="ds-detail-label">Location</span>
                      <span>{selected.lat.toFixed(2)}°, {selected.lng.toFixed(2)}°</span>
                    </div>
                    {selected.severity && (
                      <div className="ds-detail-row">
                        <span className="ds-detail-label">Severity</span>
                        <span>{selected.severity}</span>
                      </div>
                    )}
                    <div className="ds-detail-row">
                      <span className="ds-detail-label">Source</span>
                      <span>{selected.source === 'usgs' ? 'USGS' : selected.source === 'nasa-eonet' ? 'NASA EONET' : 'GDACS'}</span>
                    </div>
                  </div>
                  {selected.description && (
                    <div className="ds-detail-desc">{selected.description}</div>
                  )}
                  <div className="ds-detail-actions">
                    {selected.link && (
                      <a
                        className="ds-detail-link"
                        href={selected.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View full report ↗
                      </a>
                    )}
                    <button className="ds-detail-close" onClick={() => setSelected(null)}>
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
