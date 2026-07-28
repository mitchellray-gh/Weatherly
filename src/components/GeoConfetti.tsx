import { useEffect, useState } from 'react'
import './GeoConfetti.css'

interface Burst {
  id: number
  x: number
  y: number
  bits: Bit[]
}
interface Bit {
  k: number
  dx: number
  dy: number
  rot: number
  size: number
  kind: number // 0 triangle, 1 diamond, 2 ring, 3 plus
  hue: string
}

const PALETTE = ['#ffe6a8', '#a8d8ff', '#ffb3d1', '#b6f0c4', '#d4b3ff', '#ffffff']

let seq = 0

/**
 * The Geo "fun zone" tap toy: every pointer press bursts a little shower of
 * geometric confetti (triangles, diamonds, rings, plus-signs) that fly outward
 * and fade. Purely decorative — the overlay never blocks pointer events.
 */
export function GeoConfetti() {
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Ignore presses on the settings/search controls so it stays pleasant.
      const t = e.target as HTMLElement | null
      if (t?.closest('input, .geo-header, .search-results')) return
      const n = 8 + Math.floor(Math.random() * 5)
      const bits: Bit[] = Array.from({ length: n }, (_, k) => {
        const ang = (k / n) * Math.PI * 2 + Math.random() * 0.6
        const dist = 40 + Math.random() * 70
        return {
          k,
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist - 20, // bias upward for a pop
          rot: (Math.random() - 0.5) * 540,
          size: 7 + Math.random() * 9,
          kind: Math.floor(Math.random() * 4),
          hue: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        }
      })
      const burst: Burst = { id: ++seq, x: e.clientX, y: e.clientY, bits }
      setBursts((prev) => [...prev, burst])
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burst.id))
      }, 950)
    }
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  return (
    <div className="geo-confetti" aria-hidden>
      {bursts.map((b) => (
        <div key={b.id} className="gc-burst" style={{ left: b.x, top: b.y }}>
          {b.bits.map((bit) => (
            <span
              key={bit.k}
              className={`gc-bit gc-bit--${bit.kind}`}
              style={
                {
                  '--dx': `${bit.dx}px`,
                  '--dy': `${bit.dy}px`,
                  '--rot': `${bit.rot}deg`,
                  '--sz': `${bit.size}px`,
                  '--hue': bit.hue,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}
