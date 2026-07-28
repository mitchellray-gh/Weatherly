import { useEffect, useMemo, useRef, useState } from 'react'
import type { DayPoint, Settings, WeatherBundle } from '../types'
import type { MetricKey } from '../lib/metricDefs'
import { cToUnit, degToCompass, formatTemp, formatWind } from '../lib/units'
import { describe } from '../lib/weatherCodes'
import { activitySuggestions, scoreLabel } from '../lib/activity'
import { GeoRadar } from './GeoRadar'
import './GeoJourney.css'

interface Props {
  bundle: WeatherBundle
  settings: Settings
  onSelectHour: (time: string) => void
  onSelectDay: (date: string) => void
  onSelectMetric: (m: MetricKey) => void
  onSelectActivity: (id: string) => void
  onSelectSun: () => void
  onSelectPlace: () => void
}

const CHAPTERS = ['Now', "Today's Arc", 'The Hours', 'The Days', 'Moments', 'The Air', 'Storms'] as const

export function GeoJourney({
  bundle,
  settings,
  onSelectHour,
  onSelectDay,
  onSelectMetric,
  onSelectActivity,
  onSelectSun,
  onSelectPlace,
}: Props) {
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  // Track which scene is centered (rail) + reveal scenes as they enter view.
  useEffect(() => {
    const scenes = rootRef.current?.querySelectorAll('.gj-scene')
    if (!scenes) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in-view')
            const i = Number((e.target as HTMLElement).dataset.i)
            if (e.intersectionRatio > 0.5) setActive(i)
          }
        }
      },
      { threshold: [0.2, 0.55] },
    )
    scenes.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  function goTo(i: number) {
    rootRef.current?.querySelectorAll('.gj-scene')[i]?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="gj" ref={rootRef}>
      <NowScene
        bundle={bundle}
        settings={settings}
        onSelectPlace={onSelectPlace}
        onSelectHour={onSelectHour}
        onSelectMetric={onSelectMetric}
        onSelectDay={onSelectDay}
      />
      <ArcScene bundle={bundle} settings={settings} onSelectSun={onSelectSun} />
      <HoursScene bundle={bundle} settings={settings} onSelectHour={onSelectHour} />
      <DaysScene bundle={bundle} settings={settings} onSelectDay={onSelectDay} />
      <MomentsScene bundle={bundle} settings={settings} onSelectActivity={onSelectActivity} />
      <AirScene bundle={bundle} settings={settings} onSelectMetric={onSelectMetric} />
      <GeoRadar location={bundle.location} active={active === 6} />

      {/* Journey progress rail */}
      <nav className="gj-rail" aria-label="Journey chapters">
        {CHAPTERS.map((c, i) => (
          <button
            key={c}
            className={`gj-dot ${i === active ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={c}
          >
            <span className="gj-dot-label">{c}</span>
          </button>
        ))}
      </nav>

      {active < CHAPTERS.length - 1 && (
        <button className="gj-next" onClick={() => goTo(active + 1)} aria-label="Continue">
          ↓
        </button>
      )}
    </div>
  )
}

// --- Scene 1: NOW ------------------------------------------------------

function NowScene({
  bundle,
  settings,
  onSelectPlace,
  onSelectHour,
  onSelectMetric,
  onSelectDay,
}: {
  bundle: WeatherBundle
  settings: Settings
  onSelectPlace: () => void
  onSelectHour: (time: string) => void
  onSelectMetric: (m: MetricKey) => void
  onSelectDay: (date: string) => void
}) {
  const c = bundle.current
  const today = bundle.daily[0]
  const place = [bundle.location.name, bundle.location.admin1].filter(Boolean).join(', ')
  const nowHour = bundle.hourly[0]?.time
  return (
    <section className="gj-scene gj-now" data-i={0}>
      <div className="gj-chapter">Now</div>
      <button className="gj-place gj-tap" onClick={onSelectPlace}>
        {place || 'Current Location'}
      </button>
      <button
        className="gj-bigtemp gj-tap"
        onClick={() => nowHour && onSelectHour(nowHour)}
      >
        {formatTemp(c.temperature, settings.temperature)}
      </button>
      <button className="gj-cond gj-tap" onClick={() => nowHour && onSelectHour(nowHour)}>
        {describe(c.weatherCode)}
      </button>
      <div className="gj-sub">
        <button className="gj-tap gj-sub-btn" onClick={() => onSelectMetric('feels')}>
          Feels {formatTemp(c.apparentTemperature, settings.temperature)}
        </button>
        {today && (
          <button className="gj-tap gj-sub-btn" onClick={() => onSelectDay(today.date)}>
            <span className="gj-dot-sep">·</span>
            {formatTemp(today.tempMax, settings.temperature)} /{' '}
            {formatTemp(today.tempMin, settings.temperature)}
          </button>
        )}
      </div>
    </section>
  )
}

// --- Scene 2: TODAY'S ARC (geometric sun path) -------------------------

function ArcScene({
  bundle,
  settings,
  onSelectSun,
}: {
  bundle: WeatherBundle
  settings: Settings
  onSelectSun: () => void
}) {
  const today = bundle.daily[0]
  if (!today) return null
  const now = Date.now()
  const rise = new Date(today.sunrise).getTime()
  const set = new Date(today.sunset).getTime()
  const frac = Math.max(0, Math.min(1, (now - rise) / (set - rise)))
  const daylightH = Math.round(today.daylightSeconds / 3600)

  // Semicircle arc geometry.
  const W = 300
  const H = 170
  const pad = 20
  const cx = W / 2
  const baseY = H - 20
  const rx = W / 2 - pad
  const ry = H - 40
  const ang = Math.PI * (1 - frac) // left→right along the top arc
  const sx = cx - rx * Math.cos(ang)
  const sy = baseY - ry * Math.sin(ang)
  const below = frac <= 0 || frac >= 1

  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <section className="gj-scene gj-arc" data-i={1}>
      <div className="gj-chapter">Today&rsquo;s Arc</div>
      <button className="gj-arc-tap gj-tap" onClick={onSelectSun}>
        <svg className="gj-arc-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sun path">
        <defs>
          <linearGradient id="gj-arc-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="0.5" stopColor="rgba(255,225,150,0.85)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.25)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${pad} ${baseY} A ${rx} ${ry} 0 0 1 ${W - pad} ${baseY}`}
          fill="none"
          stroke="url(#gj-arc-grad)"
          strokeWidth="2"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
        <line
          x1={pad - 4}
          y1={baseY}
          x2={W - pad + 4}
          y2={baseY}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />
        {!below && (
          <circle cx={sx} cy={sy} r="9" fill="#ffe6a8">
            <animate attributeName="r" values="8;10;8" dur="4s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
      <div className="gj-arc-times">
        <div>
          <div className="gj-arc-num">{timeLabel(today.sunrise)}</div>
          <div className="gj-arc-cap">Sunrise</div>
        </div>
        <div className="gj-arc-mid">
          <div className="gj-arc-num">{daylightH}h</div>
          <div className="gj-arc-cap">Daylight</div>
        </div>
        <div>
          <div className="gj-arc-num">{timeLabel(today.sunset)}</div>
          <div className="gj-arc-cap">Sunset</div>
        </div>
      </div>
      </button>
      <div className="gj-sub">
        High {formatTemp(today.tempMax, settings.temperature)} · Low{' '}
        {formatTemp(today.tempMin, settings.temperature)}
      </div>
    </section>
  )
}

// --- Scene 3: THE HOURS AHEAD (temperature ridgeline) ------------------

function HoursScene({
  bundle,
  settings,
  onSelectHour,
}: {
  bundle: WeatherBundle
  settings: Settings
  onSelectHour: (time: string) => void
}) {
  const now = Date.now()
  const hours = bundle.hourly
    .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 24)

  const model = useMemo(() => {
    if (hours.length < 2) return null
    const temps = hours.map((h) => cToUnit(h.temperature, settings.temperature))
    const lo = Math.min(...temps)
    const hi = Math.max(...temps)
    const span = hi - lo || 1
    const W = 320
    const H = 200
    const base = H - 26
    const top = 26
    const x = (i: number) => (i / (hours.length - 1)) * W
    const y = (v: number) => base - ((v - lo) / span) * (base - top)
    const pts = temps.map((v, i) => [x(i), y(v)] as const)
    const ridge = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
    const area = `${ridge} L ${W} ${base} L 0 ${base} Z`
    return { temps, lo, hi, W, H, base, x, y, pts, ridge, area }
  }, [hours, settings.temperature])

  if (!model) return null

  return (
    <section className="gj-scene gj-hours" data-i={2}>
      <div className="gj-chapter">The Hours Ahead</div>
      <svg
        className="gj-ridge"
        viewBox={`0 0 ${model.W} ${model.H}`}
        role="img"
        aria-label="Temperature over the next 24 hours"
      >
        <defs>
          <linearGradient id="gj-ridge-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(120,180,255,0.42)" />
            <stop offset="1" stopColor="rgba(120,180,255,0)" />
          </linearGradient>
        </defs>
        <path d={model.area} fill="url(#gj-ridge-fill)" />
        <path
          d={model.ridge}
          fill="none"
          stroke="rgba(230,240,255,0.95)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hours.map((h, i) =>
          i % 3 === 0 ? (
            <g key={h.time}>
              <circle
                className="gj-ridge-node"
                cx={model.pts[i][0]}
                cy={model.pts[i][1]}
                r="6"
                fill="transparent"
                onClick={() => onSelectHour(h.time)}
              />
              <circle cx={model.pts[i][0]} cy={model.pts[i][1]} r="2.4" fill="#fff" />
              <text
                className="gj-ridge-temp"
                x={model.pts[i][0]}
                y={model.pts[i][1] - 9}
                textAnchor="middle"
              >
                {Math.round(model.temps[i])}°
              </text>
              <text className="gj-ridge-hour" x={model.pts[i][0]} y={model.H - 8} textAnchor="middle">
                {i === 0 ? 'Now' : new Date(h.time).toLocaleTimeString([], { hour: 'numeric' })}
              </text>
            </g>
          ) : null,
        )}
      </svg>
      <div className="gj-hint">Trace the ridge · tap a peak for the hour</div>
    </section>
  )
}

// --- Scene 4: THE DAYS AHEAD (range mountain profile) ------------------

function DaysScene({
  bundle,
  settings,
  onSelectDay,
}: {
  bundle: WeatherBundle
  settings: Settings
  onSelectDay: (date: string) => void
}) {
  const days: DayPoint[] = bundle.daily.slice(0, 7)
  if (days.length < 2) return null

  const highs = days.map((d) => cToUnit(d.tempMax, settings.temperature))
  const lows = days.map((d) => cToUnit(d.tempMin, settings.temperature))
  const lo = Math.min(...lows)
  const hi = Math.max(...highs)
  const span = hi - lo || 1
  const H = 220
  const top = 30
  const bottom = H - 30
  const y = (v: number) => bottom - ((v - lo) / span) * (bottom - top)
  const colW = 100 / days.length

  return (
    <section className="gj-scene gj-days" data-i={3}>
      <div className="gj-chapter">The Days Ahead</div>
      <div className="gj-days-range">
        {days.map((d, i) => {
          const yh = y(highs[i])
          const yl = y(lows[i])
          const wd = i === 0 ? 'Today' : new Date(d.date + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })
          return (
            <button
              key={d.date}
              className="gj-day-col"
              style={{ width: `${colW}%` }}
              onClick={() => onSelectDay(d.date)}
            >
              <span className="gj-day-hi">{Math.round(highs[i])}°</span>
              <span
                className="gj-day-bar"
                style={{ top: `${(yh / H) * 100}%`, height: `${((yl - yh) / H) * 100}%` }}
              />
              <span className="gj-day-lo" style={{ top: `${(yl / H) * 100}%` }}>
                {Math.round(lows[i])}°
              </span>
              <span className="gj-day-name">{wd}</span>
            </button>
          )
        })}
      </div>
      <div className="gj-hint">Peaks and valleys of the week · tap a day</div>
    </section>
  )
}

// --- Scene 5: MOMENTS (activity waypoints along a trail) ---------------

function MomentsScene({
  bundle,
  settings,
  onSelectActivity,
}: {
  bundle: WeatherBundle
  settings: Settings
  onSelectActivity: (id: string) => void
}) {
  const suggestions = useMemo(
    () => activitySuggestions(bundle.hourly, settings.activities).slice(0, 6),
    [bundle.hourly, settings.activities],
  )
  if (suggestions.length === 0) return null

  function whenShort(time: Date): string {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const dd = Math.round((new Date(time).setHours(0, 0, 0, 0) - startOfToday.getTime()) / 86400000)
    const hr = time.toLocaleTimeString([], { hour: 'numeric' })
    if (dd === 0) return `Today ${hr}`
    if (dd === 1) return `Tomorrow ${hr}`
    return `${time.toLocaleDateString([], { weekday: 'short' })} ${hr}`
  }

  // Lay the waypoints along a gentle vector trail across the scene.
  const n = suggestions.length
  const pts = suggestions.map((_, i) => {
    const fx = n === 1 ? 0.5 : i / (n - 1)
    const x = 10 + fx * 80
    const y = 60 + Math.sin(fx * Math.PI * 1.4) * -26
    return { x, y }
  })
  const trail = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <section className="gj-scene gj-moments" data-i={4}>
      <div className="gj-chapter">Moments</div>
      <p className="gj-moments-lead">Good times to be outside, marked along the way</p>

      <div className="gj-trailwrap">
        <svg className="gj-trail" viewBox="0 0 100 90" preserveAspectRatio="none">
          <path d={trail} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.5" strokeDasharray="1.4 2.2" strokeLinecap="round" />
        </svg>
        {suggestions.map((s, i) => (
          <button
            key={s.def.id}
            className={`gj-waypoint ${s.def.conditional ? 'alert' : ''}`}
            style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%`, animationDelay: `${i * 0.12}s` }}
            onClick={() => onSelectActivity(s.def.id)}
          >
            <span className="gj-wp-halo" />
            <span className="gj-wp-emoji">{s.def.emoji}</span>
            <span className="gj-wp-card">
              <span className="gj-wp-title">{s.def.title}</span>
              <span className="gj-wp-when">{whenShort(s.window.time)}</span>
              <span className="gj-wp-tier" data-tier={scoreLabel(s.window.score)}>
                {s.def.conditional ? 'Best window' : scoreLabel(s.window.score)}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="gj-hint">Tap a landmark to plan it</div>
    </section>
  )
}

// --- Scene 6: THE AIR (radial geometric gauges) ------------------------

function Gauge({
  value,
  max,
  label,
  center,
  onClick,
}: {
  value: number
  max: number
  label: string
  center: string
  onClick?: () => void
}) {
  const R = 34
  const C = 2 * Math.PI * R
  const frac = Math.max(0, Math.min(1, value / max))
  return (
    <button className="gj-gauge" onClick={onClick}>
      <svg viewBox="0 0 90 90" className="gj-gauge-svg">
        <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
        <circle
          cx="45"
          cy="45"
          r={R}
          fill="none"
          stroke="rgba(230,240,255,0.9)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(C * frac).toFixed(1)} ${C.toFixed(1)}`}
          transform="rotate(-90 45 45)"
        />
        <text x="45" y="49" textAnchor="middle" className="gj-gauge-center">
          {center}
        </text>
      </svg>
      <span className="gj-gauge-label">{label}</span>
    </button>
  )
}

function AirScene({
  bundle,
  settings,
  onSelectMetric,
}: {
  bundle: WeatherBundle
  settings: Settings
  onSelectMetric: (m: MetricKey) => void
}) {
  const c = bundle.current
  // Wind compass (geometric needle).
  const angle = (c.windDirection + 180) % 360
  const rad = ((angle - 90) * Math.PI) / 180
  const nx = 45 + 26 * Math.cos(rad)
  const ny = 45 + 26 * Math.sin(rad)

  return (
    <section className="gj-scene gj-air" data-i={5}>
      <div className="gj-chapter">The Air</div>
      <div className="gj-gauges">
        <button className="gj-gauge" onClick={() => onSelectMetric('wind')}>
          <svg viewBox="0 0 90 90" className="gj-gauge-svg">
            <circle cx="45" cy="45" r="34" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
            <line x1="45" y1="45" x2={nx} y2={ny} stroke="rgba(230,240,255,0.95)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="45" cy="45" r="3" fill="#fff" />
            <text x="45" y="70" textAnchor="middle" className="gj-gauge-center" style={{ fontSize: 9 }}>
              {degToCompass(c.windDirection)}
            </text>
          </svg>
          <span className="gj-gauge-label">{formatWind(c.windSpeed, settings.wind)}</span>
        </button>
        <Gauge
          value={c.humidity}
          max={100}
          label="Humidity"
          center={`${Math.round(c.humidity)}%`}
          onClick={() => onSelectMetric('humidity')}
        />
        <Gauge
          value={c.uvIndex ?? 0}
          max={11}
          label="UV Index"
          center={c.uvIndex != null ? String(Math.round(c.uvIndex)) : '—'}
          onClick={() => onSelectMetric('uv')}
        />
        <Gauge
          value={Math.max(0, Math.min(60, c.cloudCover))}
          max={100}
          label="Cloud"
          center={`${Math.round(c.cloudCover)}%`}
          onClick={() => onSelectMetric('cloud')}
        />
      </div>
      <div className="gj-sub">
        <button className="gj-tap gj-sub-btn" onClick={() => onSelectMetric('pressure')}>
          {Math.round(c.pressure)} hPa
        </button>
        {c.visibility != null && (
          <button className="gj-tap gj-sub-btn" onClick={() => onSelectMetric('visibility')}>
            <span className="gj-dot-sep">·</span>
            {Math.round(c.visibility / 1000)} km visibility
          </button>
        )}
      </div>
    </section>
  )
}
