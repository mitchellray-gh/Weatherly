import { useEffect, useMemo, useRef, useState } from 'react'
import { localDayFraction, sampleScene } from '../lib/geoScene'
import './GeoBackground.css'

interface Props {
  timezone?: string
}

/**
 * Atmospheric Vector Engine — a layered parallax "playable postcard" in the
 * spirit of Alto's Odyssey. Flat low-poly silhouettes stack over a live
 * 24-hour sky gradient; as you travel through the journey the planes slide at
 * stepped speeds (foreground fastest, horizon slowest, skybox static) to give
 * a 2.5-D sense of gliding across a landscape.
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

  // Parallax driven by the journey's own scroll container (falls back to
  // window scroll for the classic layouts). GlobalX advances as you travel.
  useEffect(() => {
    let raf = 0
    let scroller: HTMLElement | Window = window
    const readY = () =>
      scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop

    const apply = () => {
      raf = 0
      const el = rootRef.current
      if (!el) return
      const y = readY()
      el.style.setProperty('--geo-x', String(y))
      el.style.setProperty('--geo-lift', String(Math.min(1, y / 4000)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }

    const bind = () => {
      const gj = document.querySelector('.gj') as HTMLElement | null
      scroller = gj ?? window
      scroller.addEventListener('scroll', onScroll, { passive: true })
      apply()
    }
    bind()
    const retry = window.setTimeout(bind, 60)

    return () => {
      window.clearTimeout(retry)
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Sun / moon orb along a smooth arc.
  const angle = (tod - 0.5) * Math.PI * 2
  const orbX = 50 + Math.sin(angle) * 40
  const orbY = 44 - Math.cos(angle) * 38
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

  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: (i * 61.8) % 100,
        y: (i * 37.3) % 52,
        r: 0.5 + ((i * 13) % 10) / 10,
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
        <line className="geo-shoot" x1="8" y1="10" x2="20" y2="16" stroke="#fff" strokeWidth="0.3" />
      </svg>

      {/* Sun / moon orb */}
      <div
        className="geo-orb"
        style={{
          left: `${orbX}%`,
          top: `${orbY}%`,
          background: scene.orb,
          boxShadow: `0 0 70px 26px ${scene.orbGlow}, 0 0 20px 6px ${scene.orbGlow}`,
        }}
      />

      {/* Drifting clouds + a lazy hot-air balloon (day) */}
      <div className="geo-clouds" style={{ opacity: dayness }}>
        <svg className="geo-cloud geo-cloud-a" viewBox="0 0 120 40">
          <path d="M10 30 Q18 14 34 18 Q40 6 58 14 Q76 8 82 22 Q104 20 104 30 Z" fill="rgba(255,255,255,0.9)" />
        </svg>
        <svg className="geo-cloud geo-cloud-b" viewBox="0 0 120 40">
          <path d="M8 30 Q20 16 36 22 Q46 10 64 18 Q84 12 92 26 Q108 24 108 30 Z" fill="rgba(255,255,255,0.72)" />
        </svg>
        <svg className="geo-balloon" viewBox="0 0 20 30">
          <path d="M10 1 C3 1 2 9 6 15 L14 15 C18 9 17 1 10 1 Z" fill="rgba(255,255,255,0.85)" />
          <path d="M6 15 L10 20 L14 15 Z" fill="rgba(255,255,255,0.6)" />
          <rect x="8.4" y="20" width="3.2" height="2.4" rx="0.5" fill="rgba(255,255,255,0.9)" />
        </svg>
      </div>

      {/* Birds drifting across the middle distance (day) */}
      <svg className="geo-birds" viewBox="0 0 100 20" style={{ opacity: dayness * 0.8 }}>
        <g fill="none" stroke="var(--l2)" strokeWidth="0.5" strokeLinecap="round">
          <path d="M0 6 Q1.4 4.4 2.8 6 Q4.2 4.4 5.6 6" />
          <path d="M8 9 Q9.2 7.7 10.4 9 Q11.6 7.7 12.8 9" />
          <path d="M4 11 Q5 10 6 11 Q7 10 8 11" />
        </g>
      </svg>

      {/* Layer 3 — far mountain range (slowest) */}
      <svg className="geo-layer geo-l3" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path
          d="M0 40 L0 26 L10 18 L18 24 L28 12 L38 22 L50 14 L60 24 L72 16 L82 24 L92 18 L100 24 L100 40 Z"
          fill="var(--l3)"
        />
      </svg>

      {/* Layer 2 — distant mountains + a mesa */}
      <svg className="geo-layer geo-l2" viewBox="0 0 100 46" preserveAspectRatio="none">
        <path
          d="M0 46 L0 30 L12 12 L22 26 L34 8 L46 26 L58 14 L64 26 L72 20 L72 16 L86 16 L86 22 L100 14 L100 46 Z"
          fill="var(--l2)"
        />
      </svg>

      {/* Layer 1 — rolling hills, pines, and a temple silhouette */}
      <svg className="geo-layer geo-l1" viewBox="0 0 100 44" preserveAspectRatio="none">
        <path d="M0 44 L0 26 Q22 12 44 22 Q64 31 82 20 Q92 15 100 22 L100 44 Z" fill="var(--l1)" />
        <g fill="var(--l1)">
          <polygon points="16,26 20,14 24,26" />
          <polygon points="17,22 20,17 23,22" />
          <polygon points="64,26 67,16 70,26" />
          <polygon points="88,26 91,18 94,26" />
          <polygon points="46,24 50,17 54,24" />
          <rect x="47.5" y="22" width="5" height="4" />
          <polygon points="45,22 50,18 55,22" />
        </g>
      </svg>

      {/* Layer 0 — foreground dune with a lone traveler (fastest) */}
      <svg className="geo-layer geo-l0" viewBox="0 0 100 34" preserveAspectRatio="none">
        <path d="M0 34 L0 20 Q30 6 62 16 Q82 22 100 14 L100 34 Z" fill="var(--l0)" />
        <g fill="var(--l0)" className="geo-traveler">
          <circle cx="52" cy="13.2" r="0.9" />
          <rect x="51.4" y="13.8" width="1.2" height="3" rx="0.5" />
        </g>
      </svg>
    </div>
  )
}
