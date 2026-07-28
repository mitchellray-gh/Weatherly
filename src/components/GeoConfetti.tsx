import { useEffect, useState } from 'react'
import './GeoConfetti.css'

interface Ripple {
  id: number
  x: number
  y: number
  sides: number
  rot: number
}

let seq = 0

/**
 * On-brand geometric tap feedback: a press sends out a couple of thin
 * concentric wireframe polygon rings (matching the floating constellation
 * shapes) that expand and fade. No colour, no clutter — just clean geometry.
 */
export function GeoConfetti() {
  const [ripples, setRipples] = useState<Ripple[]>([])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Ignore presses on the settings/search controls so it stays pleasant.
      const t = e.target as HTMLElement | null
      if (t?.closest('input, .geo-header, .search-results')) return
      const ripple: Ripple = {
        id: ++seq,
        x: e.clientX,
        y: e.clientY,
        sides: 3 + Math.floor(Math.random() * 4), // triangle..hexagon
        rot: Math.floor(Math.random() * 360),
      }
      setRipples((prev) => [...prev, ripple])
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id))
      }, 900)
    }
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  function poly(sides: number, r = 46): string {
    return Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2
      return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
    }).join(' ')
  }

  return (
    <div className="geo-confetti" aria-hidden>
      {ripples.map((r) => (
        <svg
          key={r.id}
          className="gc-ripple"
          viewBox="0 0 100 100"
          style={{ left: r.x, top: r.y, ['--rot' as string]: `${r.rot}deg` }}
        >
          <polygon
            className="gc-ring gc-ring-1"
            points={poly(r.sides)}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            className="gc-ring gc-ring-2"
            points={poly(r.sides)}
            fill="none"
            stroke="rgba(255,246,220,0.5)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  )
}
