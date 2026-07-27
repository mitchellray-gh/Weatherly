import { useEffect, useMemo, useRef, useState } from 'react'
import { localDayFraction, sampleScene } from '../lib/geoScene'
import './GeoBackground.css'

interface Props {
  timezone?: string
}

/**
 * Atmospheric Vector Engine — a 5-plane parallax "playable postcard" scene.
 * Flat low-poly silhouettes layered over a 24-hour sky gradient, driven by
 * the location's real local time. Foreground planes translate fastest; the
 * skybox is static.
 */
export function GeoBackground({ timezone }: Props) {
  const [tod, setTod] = useState(() => localDayFraction(timezone))
  const rootRef = useRef<HTMLDivElement>(null)

  // Re-sample the clock every 30 s so the lighting cycle stays live.
  useEffect(() => {
    setTod(localDayFraction(timezone))
    const id = window.setInterval(() => setTod(localDayFraction(timezone)), 30_000)
    return () => window.clearInterval(id)
  }, [timezone])

  const scene = useMemo(() => sampleScene(tod), [tod])

  // Parallax: a global horizontal offset derived from scroll position.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        rootRef.current?.style.setProperty('--geo-x', String(window.scrollY))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Sun / moon orb position along a smooth arc: rises east at dawn, peaks at
  // noon, sets west at dusk, dips low (moon) at midnight.
  const angle = (tod - 0.5) * Math.PI * 2
  const orbX = 50 + Math.sin(angle) * 42
  const orbY = 46 - Math.cos(angle) * 40
  const dayness = 1 - scene.stars

  const styleVars = {
    '--sky-top': scene.skyTop,
    '--sky-mid': scene.skyMid,
    '--sky-bottom': scene.skyBottom,
    '--l0': scene.l0,
    '--l1': scene.l1,
    '--l2': scene.l2,
    '--l3': scene.l3,
    '--orb': scene.orb,
    '--orb-glow': scene.orbGlow,
    '--stars': scene.stars,
    '--geo-ink': scene.ink,
  } as React.CSSProperties

  // A stable set of stars.
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        x: (i * 61.8) % 100,
        y: (i * 37.3) % 55,
        r: 0.6 + ((i * 13) % 10) / 10,
        d: (i % 7) * 0.4,
      })),
    [],
  )

  return (
    <div ref={rootRef} className="geo" aria-hidden style={styleVars}>
      {/* Layer 4 — static skybox gradient */}
      <div className="geo-sky" />

      {/* Star field (night) */}
      <svg className="geo-stars" viewBox="0 0 100 60" preserveAspectRatio="none">
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r * 0.12}
            fill="#ffffff"
            style={{ animationDelay: `${s.d}s` }}
          />
        ))}
      </svg>

      {/* Sun / moon orb */}
      <div
        className="geo-orb"
        style={{
          left: `${orbX}%`,
          top: `${orbY}%`,
          background: scene.orb,
          boxShadow: `0 0 60px 24px ${scene.orbGlow}, 0 0 18px 6px ${scene.orbGlow}`,
        }}
      />

      {/* Drifting vector clouds (day) */}
      <div className="geo-clouds" style={{ opacity: dayness * 0.9 }}>
        <svg className="geo-cloud geo-cloud-a" viewBox="0 0 120 40">
          <path
            d="M10 30 Q18 14 34 18 Q40 6 58 14 Q76 8 82 22 Q104 20 104 30 Z"
            fill="rgba(255,255,255,0.9)"
          />
        </svg>
        <svg className="geo-cloud geo-cloud-b" viewBox="0 0 120 40">
          <path
            d="M8 30 Q20 16 36 22 Q46 10 64 18 Q84 12 92 26 Q108 24 108 30 Z"
            fill="rgba(255,255,255,0.75)"
          />
        </svg>
      </div>

      {/* Layer 3 — far horizon (slowest) */}
      <svg className="geo-layer geo-l3" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d="M0 30 L0 20 Q20 12 40 18 Q65 26 100 14 L100 30 Z" fill="var(--l3)" />
      </svg>

      {/* Layer 2 — distant mountains */}
      <svg className="geo-layer geo-l2" viewBox="0 0 100 34" preserveAspectRatio="none">
        <path
          d="M0 34 L0 22 L14 8 L26 20 L40 4 L56 22 L70 10 L84 22 L100 12 L100 34 Z"
          fill="var(--l2)"
        />
      </svg>

      {/* Layer 1 — midground hills + trees */}
      <svg className="geo-layer geo-l1" viewBox="0 0 100 34" preserveAspectRatio="none">
        <path d="M0 34 L0 22 Q26 10 52 20 Q78 30 100 18 L100 34 Z" fill="var(--l1)" />
        <g fill="var(--l1)">
          <polygon points="20,22 23,12 26,22" />
          <polygon points="70,24 73,13 76,24" />
          <polygon points="84,25 86,17 88,25" />
        </g>
      </svg>

      {/* Layer 0 — foreground dune (fastest) */}
      <svg className="geo-layer geo-l0" viewBox="0 0 100 26" preserveAspectRatio="none">
        <path d="M0 26 L0 16 Q34 2 68 12 Q86 17 100 10 L100 26 Z" fill="var(--l0)" />
      </svg>
    </div>
  )
}
