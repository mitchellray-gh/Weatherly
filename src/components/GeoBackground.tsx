import { useEffect, useMemo, useRef, useState } from 'react'
import { localDayFraction, sampleLight, sampleScene } from '../lib/geoScene'
import './GeoBackground.css'

interface Props {
  timezone?: string
  weatherCode?: number
}

/**
 * Atmospheric Vector Engine — a layered parallax "playable postcard" in the
 * spirit of Alto's Odyssey. Flat low-poly silhouettes stack over a live
 * 24-hour sky gradient with a moving sun/moon that lights the structures and
 * casts long shadows. Parallax planes slide at stepped speeds as you travel.
 */
export function GeoBackground({ timezone, weatherCode }: Props) {
  const [tod, setTod] = useState(() => localDayFraction(timezone))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTod(localDayFraction(timezone))
    const id = window.setInterval(() => setTod(localDayFraction(timezone)), 30_000)
    return () => window.clearInterval(id)
  }, [timezone])

  const scene = useMemo(() => sampleScene(tod), [tod])
  const light = useMemo(() => sampleLight(tod), [tod])

  // Parallax driven by the journey's own scroll container.
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
      // Scroll velocity spins the geometric shapes faster where the user lingers
      // and interacts — the journey reacts to the traveller's momentum.
      el.style.setProperty('--geo-scroll', String((y % 2000) / 2000))
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

  // Pointer / device tilt drives a true 2.5-D parallax — planes and geometric
  // shapes shift on separate depth axes as you move, giving the flat vectors
  // volume and life.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let raf = 0
    let tx = 0
    let ty = 0
    const write = () => {
      raf = 0
      el.style.setProperty('--geo-tilt-x', tx.toFixed(3))
      el.style.setProperty('--geo-tilt-y', ty.toFixed(3))
    }
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2
      ty = (e.clientY / window.innerHeight - 0.5) * 2
      if (!raf) raf = requestAnimationFrame(write)
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      tx = Math.max(-1, Math.min(1, e.gamma / 30))
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30))
      if (!raf) raf = requestAnimationFrame(write)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('deviceorientation', onTilt)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('deviceorientation', onTilt)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const orbX = light.x
  const orbY = light.y
  const dayness = 1 - scene.stars

  // Directional shadow skew for foreground objects.
  const shDir = light.x < 50 ? 1 : -1
  const shSkew = shDir * (8 + (1 - light.elevation) * 26)

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
    '--geo-key': light.key,
    '--geo-intensity': light.intensity,
    '--geo-lightx': `${light.x}%`,
    '--geo-lighty': `${light.y}%`,
    '--geo-rim': 0.1 + light.elevation * 0.4,
    '--geo-shadow': (0.12 + (1 - light.elevation) * 0.22).toFixed(3),
    '--geo-shskew': `${shSkew}deg`,
    '--geo-shscale': (0.5 + (1 - light.elevation) * 1.4).toFixed(2),
  } as React.CSSProperties

  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        x: (i * 61.8) % 100,
        y: (i * 37.3) % 52,
        r: 0.5 + ((i * 13) % 10) / 10,
        d: (i % 7) * 0.4,
      })),
    [],
  )

  // Night lanterns rising slowly.
  const lanterns = useMemo(
    () => [
      { x: 22, delay: 0, dur: 26 },
      { x: 44, delay: 6, dur: 32 },
      { x: 63, delay: 12, dur: 29 },
      { x: 80, delay: 3, dur: 34 },
    ],
    [],
  )

  // Floating geometric constellation — spinning low-poly wireframe shapes that
  // live at different parallax depths and rotate continuously, giving the flat
  // scene a lively, generative, 2.5-D machine-drawn quality. Each shape has a
  // little personality: some dashed, some with inner spokes or corner dots, and
  // all drift on gentle bobbing float paths for a whimsical feel.
  const shapes = useMemo(
    () =>
      [
        { sides: 3, x: 14, y: 22, size: 62, depth: 0.12, dur: 44, dir: 1, style: 'spokes', dash: false, float: 9 },
        { sides: 6, x: 84, y: 28, size: 92, depth: 0.2, dur: 74, dir: -1, style: 'dots', dash: true, float: 7 },
        { sides: 4, x: 73, y: 14, size: 40, depth: 0.32, dur: 30, dir: 1, style: 'plain', dash: false, float: 12 },
        { sides: 5, x: 26, y: 44, size: 54, depth: 0.44, dur: 58, dir: -1, style: 'spokes', dash: false, float: 8 },
        { sides: 8, x: 55, y: 20, size: 30, depth: 0.52, dur: 38, dir: 1, style: 'dots', dash: true, float: 11 },
        { sides: 3, x: 60, y: 40, size: 24, depth: 0.6, dur: 26, dir: -1, style: 'plain', dash: true, float: 14 },
        { sides: 7, x: 38, y: 12, size: 34, depth: 0.28, dur: 50, dir: 1, style: 'spokes', dash: false, float: 10 },
        { sides: 4, x: 90, y: 48, size: 20, depth: 0.66, dur: 22, dir: -1, style: 'dots', dash: false, float: 15 },
      ] as const,
    [],
  )

  // Whimsical geometric motes — tiny shapes that slowly orbit and twinkle.
  const motes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: (i * 47.3) % 100,
        y: (i * 29.7) % 56,
        s: 3 + ((i * 7) % 5),
        dur: 16 + ((i * 5) % 12),
        delay: (i % 6) * 1.1,
        kind: i % 3, // 0 diamond, 1 triangle, 2 ring
      })),
    [],
  )

  // Weather-reactive geometric precipitation: diamond rain streaks or drifting
  // spinning snow shapes, keyed to the current WMO weather code.
  const precip = useMemo<'rain' | 'snow' | null>(() => {
    const c = weatherCode
    if (c == null) return null
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow'
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || (c >= 95 && c <= 99)) return 'rain'
    return null
  }, [weatherCode])

  const drops = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        x: (i * 29.7 + 5) % 100,
        delay: (i % 11) * 0.28 + Math.random() * 0.4,
        dur: 0.7 + ((i * 7) % 6) / 10,
        s: 6 + ((i * 5) % 7),
        drift: ((i % 5) - 2) * 6,
        rot: (i % 2 ? 1 : -1) * (180 + (i % 3) * 120),
      })),
    [],
  )

  // Point string for a regular polygon centered in a 100×100 box.
  function poly(sides: number, r = 46): string {
    return Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2
      return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
    }).join(' ')
  }

  // Vertices as [x,y] pairs for decorating corners with dots / spokes.
  function verts(sides: number, r = 46): Array<[number, number]> {
    return Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2
      return [50 + r * Math.cos(a), 50 + r * Math.sin(a)] as [number, number]
    })
  }

  return (
    <div ref={rootRef} className="geo" aria-hidden style={styleVars}>
      {/* Layer 4 — static skybox gradient */}
      <div className="geo-sky" />

      {/* Sunlight / moonlight wash centered on the orb */}
      <div className="geo-lightwash" />

      {/* Legibility scrim — a soft darkening so journey content stays readable */}
      <div className="geo-scrim" />

      {/* Spinning geometric constellation — low-poly wireframes at varied depths */}
      <div className="geo-shapes">
        {/* Constellation connector lines linking nearby shapes into a figure. */}
        <svg className="geo-constellation" viewBox="0 0 100 100" preserveAspectRatio="none">
          {shapes.map((s, i) => {
            const next = shapes[(i + 1) % shapes.length]
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={next.x}
                y2={next.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.25"
                strokeDasharray="1.5 2"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
        {shapes.map((s, i) => (
          <svg
            key={i}
            className={`geo-shape geo-shape--${s.style}`}
            viewBox="0 0 100 100"
            style={
              {
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                '--sd': s.depth,
                '--spin': `${s.dur}s`,
                '--dir': s.dir,
                '--float': `${s.float}s`,
              } as React.CSSProperties
            }
          >
            <g className="geo-shape-spin">
              <polygon
                points={poly(s.sides)}
                fill="none"
                stroke="rgba(255,255,255,0.34)"
                strokeWidth="1"
                strokeLinejoin="round"
                strokeDasharray={s.dash ? '4 5' : undefined}
                vectorEffect="non-scaling-stroke"
              />
              <polygon
                points={poly(s.sides, 24)}
                fill="rgba(255,255,255,0.03)"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
              />
              {/* Inner spokes radiating from center to each vertex. */}
              {s.style === 'spokes' &&
                verts(s.sides).map(([vx, vy], k) => (
                  <line
                    key={k}
                    x1="50"
                    y1="50"
                    x2={vx.toFixed(1)}
                    y2={vy.toFixed(1)}
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              {/* Little dots pinned to each corner. */}
              {s.style === 'dots' &&
                verts(s.sides).map(([vx, vy], k) => (
                  <circle key={k} cx={vx.toFixed(1)} cy={vy.toFixed(1)} r="1.6" fill="rgba(255,255,255,0.4)" />
                ))}
              {/* A tiny pulsing heart-dot at the very center. */}
              <circle className="geo-shape-core" cx="50" cy="50" r="1.4" fill="rgba(255,246,220,0.7)" />
            </g>
          </svg>
        ))}
      </div>

      {/* Whimsical geometric motes drifting through the mid-air */}
      <svg className="geo-motes" viewBox="0 0 100 60" preserveAspectRatio="none">
        {motes.map((m, i) => (
          <g
            key={i}
            className="geo-mote"
            style={{ animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }}
            transform={`translate(${m.x} ${m.y})`}
          >
            {m.kind === 0 && (
              <rect
                x={-m.s * 0.05}
                y={-m.s * 0.05}
                width={m.s * 0.1}
                height={m.s * 0.1}
                fill="rgba(255,255,255,0.5)"
                transform="rotate(45)"
              />
            )}
            {m.kind === 1 && (
              <polygon
                points={`0,${(-m.s * 0.07).toFixed(2)} ${(m.s * 0.06).toFixed(2)},${(m.s * 0.05).toFixed(2)} ${(-m.s * 0.06).toFixed(2)},${(m.s * 0.05).toFixed(2)}`}
                fill="rgba(255,246,220,0.55)"
              />
            )}
            {m.kind === 2 && (
              <circle r={m.s * 0.06} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
            )}
          </g>
        ))}
      </svg>

      {/* Weather-reactive geometric precipitation */}
      {precip && (
        <div className={`geo-precip geo-precip--${precip}`}>
          {drops.map((d, i) => (
            <span
              key={i}
              className="geo-drop"
              style={
                {
                  left: `${d.x}%`,
                  width: precip === 'snow' ? d.s : Math.max(2, d.s * 0.35),
                  height: precip === 'snow' ? d.s : d.s * 2.4,
                  '--pdur': `${precip === 'snow' ? d.dur * 4 : d.dur}s`,
                  '--pdelay': `${d.delay}s`,
                  '--pdrift': `${precip === 'snow' ? d.drift * 2 : d.drift}px`,
                  '--prot': `${d.rot}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}


      {/* Star field (night) */}
      <svg className="geo-stars" viewBox="0 0 100 60" preserveAspectRatio="none">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.12} fill="#ffffff" style={{ animationDelay: `${s.d}s` }} />
        ))}
        <line className="geo-shoot" x1="8" y1="10" x2="20" y2="16" stroke="#fff" strokeWidth="0.3" />
        <line className="geo-comet" x1="70" y1="8" x2="86" y2="2" stroke="#cfe0ff" strokeWidth="0.4" />
      </svg>

      {/* Sun / moon orb */}
      <div
        className="geo-orb"
        style={{
          left: `${orbX}%`,
          top: `${orbY}%`,
          background: scene.orb,
          boxShadow: `0 0 80px 30px ${scene.orbGlow}, 0 0 24px 8px ${scene.orbGlow}`,
        }}
      >
        {/* faint sun rays at high elevation */}
        {light.elevation > 0.35 && <span className="geo-rays" />}
        {/* geometric lens-flare streaks that pulse and slowly counter-rotate */}
        {dayness > 0.4 && (
          <>
            <span className="geo-flare geo-flare-star" />
            <span className="geo-flare geo-flare-cross" />
            <span className="geo-flare-ring" />
          </>
        )}
      </div>

      {/* Diegetic lens-flare beads streaking from the orb toward the corner */}
      {dayness > 0.4 && (
        <div className="geo-flarebeads" style={{ opacity: dayness * 0.7 }}>
          <span className="geo-bead" style={{ left: `${orbX}%`, top: `${orbY}%` }} />
          <span
            className="geo-bead sm"
            style={{ left: `${(orbX + 50) / 2}%`, top: `${(orbY + 50) / 2}%` }}
          />
          <span
            className="geo-bead xs"
            style={{ left: `${(orbX + 50 * 2) / 3}%`, top: `${(orbY + 50 * 2) / 3}%` }}
          />
        </div>
      )}

      {/* Clouds, balloon, and bird flock (day) */}
      <div className="geo-clouds" style={{ opacity: dayness }}>
        <svg className="geo-cloud geo-cloud-a" viewBox="0 0 120 40">
          <path d="M10 30 Q18 14 34 18 Q40 6 58 14 Q76 8 82 22 Q104 20 104 30 Z" fill="rgba(255,255,255,0.9)" />
        </svg>
        <svg className="geo-cloud geo-cloud-b" viewBox="0 0 120 40">
          <path d="M8 30 Q20 16 36 22 Q46 10 64 18 Q84 12 92 26 Q108 24 108 30 Z" fill="rgba(255,255,255,0.72)" />
        </svg>
        <svg className="geo-cloud geo-cloud-c" viewBox="0 0 120 40">
          <path d="M6 30 Q16 20 30 24 Q40 14 56 22 Q72 16 80 26 Q98 24 100 30 Z" fill="rgba(255,255,255,0.55)" />
        </svg>
        <svg className="geo-balloon" viewBox="0 0 20 30">
          <path d="M10 1 C3 1 2 9 6 15 L14 15 C18 9 17 1 10 1 Z" fill="rgba(255,255,255,0.85)" />
          <path d="M10 1 C7 1 6.5 9 8 15 L12 15 C13.5 9 13 1 10 1 Z" fill="rgba(255,200,140,0.6)" />
          <path d="M6 15 L10 20 L14 15 Z" fill="rgba(255,255,255,0.6)" />
          <rect x="8.4" y="20" width="3.2" height="2.4" rx="0.5" fill="rgba(255,255,255,0.9)" />
        </svg>
      </div>

      <svg className="geo-birds" viewBox="0 0 100 20" style={{ opacity: dayness * 0.8 }}>
        <g fill="none" stroke="var(--l2)" strokeWidth="0.5" strokeLinecap="round">
          <path d="M0 6 Q1.4 4.4 2.8 6 Q4.2 4.4 5.6 6" />
          <path d="M8 9 Q9.2 7.7 10.4 9 Q11.6 7.7 12.8 9" />
          <path d="M4 11 Q5 10 6 11 Q7 10 8 11" />
          <path d="M14 7 Q15 6 16 7 Q17 6 18 7" />
        </g>
      </svg>

      {/* Floating lanterns (night) */}
      <div className="geo-lanterns" style={{ opacity: scene.stars }}>
        {lanterns.map((l, i) => (
          <span
            key={i}
            className="geo-lantern"
            style={{ left: `${l.x}%`, animationDelay: `${l.delay}s`, animationDuration: `${l.dur}s` }}
          />
        ))}
      </div>

      {/* Layer 3 — far mountain range (slowest) */}
      <svg className="geo-layer geo-l3" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path
          d="M0 40 L0 26 L10 18 L18 24 L28 12 L38 22 L50 14 L60 24 L72 16 L82 24 L92 18 L100 24 L100 40 Z"
          fill="var(--l3)"
        />
        {/* snow-lit peaks */}
        <path d="M28 12 L31 16 L25 16 Z M72 16 L75 20 L69 20 Z" fill="rgba(255,255,255,var(--geo-rim))" />
      </svg>

      {/* Layer 2 — distant mountains, mesa, and a little town */}
      <svg className="geo-layer geo-l2" viewBox="0 0 100 46" preserveAspectRatio="none">
        <path
          d="M0 46 L0 30 L12 12 L22 26 L34 8 L46 26 L58 14 L64 26 L72 20 L72 16 L86 16 L86 22 L100 14 L100 46 Z"
          fill="var(--l2)"
        />
        <g fill="var(--l2)">
          {/* distant town rectangles */}
          <rect x="8" y="34" width="2" height="5" />
          <rect x="11" y="32" width="2.4" height="7" />
          <rect x="14.5" y="35" width="1.8" height="4" />
          <polygon points="10.5,32 12.2,29.5 13.9,32" />
        </g>
        {/* sun-lit ridge highlight */}
        <path d="M34 8 L37 12 L31 12 Z M58 14 L61 18 L55 18 Z" fill="rgba(255,240,210,var(--geo-rim))" />
      </svg>

      {/* Layer 1 — hills, pines, a temple, and a river that mirrors the sky */}
      <svg className="geo-layer geo-l1" viewBox="0 0 100 44" preserveAspectRatio="none">
        <path d="M0 44 L0 26 Q22 12 44 22 Q64 31 82 20 Q92 15 100 22 L100 44 Z" fill="var(--l1)" />
        {/* winding river reflecting sky-bottom */}
        <path d="M0 40 Q20 34 34 38 Q50 43 66 37 Q82 32 100 38 L100 44 L0 44 Z" fill="var(--sky-bottom)" opacity="0.32" />
        <g fill="var(--l1)">
          <polygon points="16,26 20,14 24,26" />
          <polygon points="17,22 20,17 23,22" />
          <polygon points="64,26 67,16 70,26" />
          <polygon points="88,26 91,18 94,26" />
          {/* pagoda / temple */}
          <polygon points="46,24 50,17 54,24" />
          <rect x="47.5" y="22" width="5" height="4" />
          <polygon points="45,22 50,18 55,22" />
        </g>
        {/* pine tips catch the light */}
        <g fill="rgba(255,240,210,var(--geo-rim))">
          <polygon points="20,14 21.4,16 18.6,16" />
          <polygon points="67,16 68.4,18 65.6,18" />
        </g>
      </svg>

      {/* Layer 0 — foreground dune, rocks, cactus, tent, traveler + shadows */}
      <svg className="geo-layer geo-l0" viewBox="0 0 100 34" preserveAspectRatio="none">
        {/* cast shadows (drawn first, skewed away from the sun) */}
        <g className="geo-shadows" fill="#000" opacity="var(--geo-shadow)">
          <ellipse cx="52" cy="15.5" rx="3" ry="0.7" />
          <ellipse cx="24" cy="18" rx="3.4" ry="0.8" />
          <ellipse cx="78" cy="16.5" rx="2.6" ry="0.7" />
        </g>
        <path d="M0 34 L0 20 Q30 6 62 16 Q82 22 100 14 L100 34 Z" fill="var(--l0)" />
        {/* wind ripples on the dune */}
        <g stroke="rgba(255,255,255,0.14)" strokeWidth="0.2" fill="none">
          <path d="M6 24 Q20 20 34 23" />
          <path d="M40 22 Q56 18 72 21" />
        </g>
        <g fill="var(--l0)">
          {/* rocks */}
          <polygon points="22,18 26,14 29,18" />
          <polygon points="76,17 79,13 82,17" />
          {/* cactus */}
          <rect x="66" y="12" width="1.1" height="5" rx="0.5" />
          <rect x="65.2" y="13.5" width="1.6" height="0.9" rx="0.4" />
          {/* tent */}
          <polygon points="9,18 12,12 15,18" />
          {/* lone traveler */}
          <g className="geo-traveler">
            <circle cx="52" cy="12.4" r="0.9" />
            <rect x="51.4" y="13" width="1.2" height="3" rx="0.5" />
          </g>
        </g>
        {/* dune crest highlight facing the sun */}
        <path d="M0 20 Q30 6 62 16" fill="none" stroke="rgba(255,240,210,var(--geo-rim))" strokeWidth="0.4" />
      </svg>
    </div>
  )
}
