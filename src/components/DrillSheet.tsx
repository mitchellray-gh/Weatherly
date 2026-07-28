import type { DayPoint, HourPoint, OutlookDay, Settings, WeatherBundle } from '../types'
import type { WeatherAlert } from '../lib/alerts'
import {
  ACTIVITY_META,
  bestWindowsByDay,
  scoreLabel,
  type ActivityKind,
} from '../lib/activity'
import { describe, iconFor } from '../lib/weatherCodes'
import { degToCompass, formatPrecip, formatTemp, formatWind } from '../lib/units'
import { Sheet } from './Sheet'
import './DrillSheet.css'

export type Drill =
  | { kind: 'activity'; activity: ActivityKind }
  | { kind: 'hour'; time: string }
  | { kind: 'day'; date: string }
  | { kind: 'rain' }
  | { kind: 'outlook'; day: OutlookDay }
  | { kind: 'sun' }
  | { kind: 'place' }
  | { kind: 'alert'; alert: WeatherAlert }

interface Props {
  drill: Drill | null
  bundle: WeatherBundle
  settings: Settings
  onClose: () => void
  onOpen: (drill: Drill) => void
}

function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function nearestHourIso(hourly: HourPoint[], target: Date): string {
  const tt = target.getTime()
  let best = hourly[0]
  let bestDiff = Infinity
  for (const h of hourly) {
    const diff = Math.abs(new Date(h.time).getTime() - tt)
    if (diff < bestDiff) {
      bestDiff = diff
      best = h
    }
  }
  return best?.time ?? target.toISOString()
}

/** A single stat row inside a detail sheet. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="drill-stat">
      <span className="drill-stat-label">{label}</span>
      <span className="drill-stat-value">{value}</span>
    </div>
  )
}

function ActivityDetail({
  activity,
  bundle,
  settings,
  onOpen,
}: {
  activity: ActivityKind
  bundle: WeatherBundle
  settings: Settings
  onOpen: (d: Drill) => void
}) {
  const meta = ACTIVITY_META[activity]
  const days = bestWindowsByDay(bundle.hourly, activity)

  return (
    <div className="drill">
      <p className="drill-lead">
        Best {meta.title.toLowerCase()} windows over the next 7 days ({meta.window}), ranked by
        suitability — feels-like temperature, rain, wind, and sky, weighted for this activity.
      </p>
      <div className="drill-list">
        {days.map((w, i) => {
          const iso = w.time.toISOString()
          return (
            <button
              key={iso}
              className={`drill-row ${i === 0 ? 'drill-row-top' : ''}`}
              onClick={() => onOpen({ kind: 'hour', time: nearestHourIso(bundle.hourly, w.time) })}
            >
              <span className="drill-row-rank">{i === 0 ? '★' : i + 1}</span>
              <span className="drill-row-main">
                <span className="drill-row-title">{dayLabel(iso.slice(0, 10))}</span>
                <span className="drill-row-sub">{timeLabel(iso)}</span>
              </span>
              <span className="drill-row-cond">
                {iconFor(w.weatherCode, true)} {formatTemp(w.temperature, settings.temperature)}
              </span>
              <span className="drill-badge" data-tier={scoreLabel(w.score)}>
                {scoreLabel(w.score)}
              </span>
            </button>
          )
        })}
        {days.length === 0 && <p className="drill-empty">No suitable windows in the next week.</p>}
      </div>
      <p className="drill-hint">Tap a day to see that hour in detail.</p>
    </div>
  )
}

function HourDetail({
  time,
  bundle,
  settings,
}: {
  time: string
  bundle: WeatherBundle
  settings: Settings
}) {
  const h = bundle.hourly.find((x) => x.time === time) ?? bundle.hourly[0]
  if (!h) return null
  return (
    <div className="drill">
      <div className="drill-hero">
        <span className="drill-hero-icon">{iconFor(h.weatherCode, h.isDay)}</span>
        <div>
          <div className="drill-hero-value">{formatTemp(h.temperature, settings.temperature)}</div>
          <div className="drill-hero-sub">{describe(h.weatherCode)}</div>
        </div>
      </div>
      <div className="drill-grid">
        <Stat label="Feels Like" value={formatTemp(h.apparentTemperature, settings.temperature)} />
        <Stat
          label="Precip Chance"
          value={h.precipitationProbability != null ? `${Math.round(h.precipitationProbability)}%` : '—'}
        />
        <Stat label="Precipitation" value={formatPrecip(h.precipitation, settings.precip)} />
        <Stat label="Humidity" value={`${Math.round(h.humidity)}%`} />
        <Stat label="Wind" value={`${formatWind(h.windSpeed, settings.wind)} ${degToCompass(h.windDirection)}`} />
        <Stat label="UV Index" value={h.uvIndex != null ? String(Math.round(h.uvIndex)) : '—'} />
      </div>
    </div>
  )
}

function DayDetail({
  date,
  bundle,
  settings,
  onOpen,
}: {
  date: string
  bundle: WeatherBundle
  settings: Settings
  onOpen: (d: Drill) => void
}) {
  const day: DayPoint | undefined = bundle.daily.find((d) => d.date === date)
  const hours = bundle.hourly.filter((h) => h.time.slice(0, 10) === date)

  return (
    <div className="drill">
      {day && (
        <>
          <div className="drill-hero">
            <span className="drill-hero-icon">{iconFor(day.weatherCode, true)}</span>
            <div>
              <div className="drill-hero-value">
                {formatTemp(day.tempMax, settings.temperature)}
                <span className="drill-hero-min"> / {formatTemp(day.tempMin, settings.temperature)}</span>
              </div>
              <div className="drill-hero-sub">{describe(day.weatherCode)}</div>
            </div>
          </div>
          <div className="drill-grid">
            <Stat
              label="Precip Chance"
              value={day.precipitationProbabilityMax != null ? `${Math.round(day.precipitationProbabilityMax)}%` : '—'}
            />
            <Stat label="Rain Total" value={formatPrecip(day.precipitationSum, settings.precip)} />
            <Stat label="Max Wind" value={formatWind(day.windSpeedMax, settings.wind)} />
            <Stat label="Wind Gusts" value={formatWind(day.windGustsMax, settings.wind)} />
            <Stat label="Max UV" value={day.uvIndexMax != null ? String(Math.round(day.uvIndexMax)) : '—'} />
            <Stat
              label="Daylight"
              value={`${Math.round(day.daylightSeconds / 3600)} hrs`}
            />
            <Stat label="Sunrise" value={timeLabel(day.sunrise)} />
            <Stat label="Sunset" value={timeLabel(day.sunset)} />
          </div>
        </>
      )}
      {hours.length > 0 && (
        <>
          <h3 className="drill-subtitle">Hour by hour</h3>
          <div className="drill-hours no-scrollbar">
            {hours.map((h) => (
              <button key={h.time} className="drill-hour" onClick={() => onOpen({ kind: 'hour', time: h.time })}>
                <span className="drill-hour-time">{new Date(h.time).toLocaleTimeString([], { hour: 'numeric' })}</span>
                <span className="drill-hour-icon">{iconFor(h.weatherCode, h.isDay)}</span>
                <span className="drill-hour-temp">{formatTemp(h.temperature, settings.temperature)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface RainPeriod {
  start: HourPoint
  end: HourPoint
  peakProb: number
  total: number
}

function rainPeriods(hourly: HourPoint[], now: number): RainPeriod[] {
  const periods: RainPeriod[] = []
  let cur: RainPeriod | null = null
  for (const h of hourly) {
    if (new Date(h.time).getTime() < now) continue
    const wet = h.precipitation >= 0.1 || (h.precipitationProbability ?? 0) >= 40
    if (wet) {
      if (!cur) {
        cur = { start: h, end: h, peakProb: h.precipitationProbability ?? 0, total: h.precipitation }
      } else {
        cur.end = h
        cur.peakProb = Math.max(cur.peakProb, h.precipitationProbability ?? 0)
        cur.total += h.precipitation
      }
    } else if (cur) {
      periods.push(cur)
      cur = null
    }
    if (periods.length >= 8) break
  }
  if (cur) periods.push(cur)
  return periods
}

/**
 * A continuous ~24-hour precipitation timeline. Unlike the period list, this
 * shows every hour — wet and dry — so users can read the rain in context of the
 * dry stretches around it, with real clock times along the x-axis.
 */
function PrecipTimeline({
  bundle,
  settings,
  onOpen,
}: {
  bundle: WeatherBundle
  settings: Settings
  onOpen: (d: Drill) => void
}) {
  const now = Date.now()
  const hours = bundle.hourly.filter((h) => new Date(h.time).getTime() >= now - 3600_000).slice(0, 24)
  if (hours.length === 0) return null
  const maxAmt = Math.max(0.5, ...hours.map((h) => h.precipitation))

  return (
    <div className="precip-tl">
      <div className="precip-tl-track">
        {hours.map((h) => {
          const prob = h.precipitationProbability ?? 0
          const wet = h.precipitation >= 0.1 || prob >= 40
          const amtFrac = Math.min(1, h.precipitation / maxAmt)
          // Wet hours scale with amount so a run of rain reads as a continuous
          // ridge; dry hours show a faint probability sliver.
          const heightPct = wet ? Math.max(14, amtFrac * 100) : Math.max(4, prob * 0.2)
          const d = new Date(h.time)
          const label = d.toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '')
          const showTick = d.getHours() % 3 === 0
          return (
            <button
              key={h.time}
              className={`precip-tl-col ${wet ? 'wet' : 'dry'}`}
              onClick={() => onOpen({ kind: 'hour', time: h.time })}
              title={`${label} · ${Math.round(prob)}% · ${formatPrecip(h.precipitation, settings.precip)}`}
            >
              <span className="precip-tl-bar-wrap">
                <span className="precip-tl-bar" style={{ height: `${heightPct}%` }} />
              </span>
              <span className="precip-tl-tick">{showTick ? label : ''}</span>
            </button>
          )
        })}
      </div>
      <div className="precip-tl-legend">
        <span>
          <span className="precip-tl-key wet" /> Rain
        </span>
        <span>
          <span className="precip-tl-key dry" /> Dry
        </span>
        <span className="precip-tl-span">Next {hours.length} hrs</span>
      </div>
    </div>
  )
}

function RainDetail({
  bundle,
  settings,
  onOpen,
}: {
  bundle: WeatherBundle
  settings: Settings
  onOpen: (d: Drill) => void
}) {
  const periods = rainPeriods(bundle.hourly, Date.now())
  return (
    <div className="drill">
      <p className="drill-lead">Upcoming precipitation periods over the next 16 days.</p>
      <PrecipTimeline bundle={bundle} settings={settings} onOpen={onOpen} />
      <div className="drill-list">
        {periods.map((p) => {
          const sameHour = p.start.time === p.end.time
          return (
            <button
              key={p.start.time}
              className="drill-row"
              onClick={() => onOpen({ kind: 'hour', time: p.start.time })}
            >
              <span className="drill-row-rank">{iconFor(p.start.weatherCode, true)}</span>
              <span className="drill-row-main">
                <span className="drill-row-title">{dayLabel(p.start.time.slice(0, 10))}</span>
                <span className="drill-row-sub">
                  {timeLabel(p.start.time)}
                  {sameHour ? '' : `–${timeLabel(p.end.time)}`}
                </span>
              </span>
              <span className="drill-row-cond">
                {Math.round(p.peakProb)}% · {formatPrecip(p.total, settings.precip)}
              </span>
            </button>
          )
        })}
        {periods.length === 0 && <p className="drill-empty">No precipitation expected in the next 16 days.</p>}
      </div>
      <p className="drill-hint">Tap a period to see that hour in detail.</p>
    </div>
  )
}

function OutlookDetail({ day, settings }: { day: OutlookDay; settings: Settings }) {
  const estimate = day.kind === 'estimate'
  return (
    <div className="drill">
      <div className="drill-hero">
        <span className="drill-hero-icon">{iconFor(day.weatherCode, true)}</span>
        <div>
          <div className="drill-hero-value">
            {formatTemp(day.tempMax, settings.temperature)}
            <span className="drill-hero-min"> / {formatTemp(day.tempMin, settings.temperature)}</span>
          </div>
          <div className="drill-hero-sub">{describe(day.weatherCode)}</div>
        </div>
      </div>
      <div className="drill-grid">
        <Stat
          label="Precip Chance"
          value={day.precipitationProbability != null ? `${Math.round(day.precipitationProbability)}%` : '—'}
        />
        <Stat label="Est. Rain" value={formatPrecip(day.precipitationSum, settings.precip)} />
        {estimate && (
          <>
            <Stat
              label="High Range"
              value={`${formatTemp(day.tempMaxLow, settings.temperature)}–${formatTemp(day.tempMaxHigh, settings.temperature)}`}
            />
            <Stat
              label="Low Range"
              value={`${formatTemp(day.tempMinLow, settings.temperature)}–${formatTemp(day.tempMinHigh, settings.temperature)}`}
            />
          </>
        )}
      </div>
      <p className="drill-lead">
        {estimate
          ? 'This is a climatological estimate (historical normals blended with climate projections), not a deterministic forecast. The ranges show the expected spread.'
          : 'This is drawn from the near-term forecast.'}
      </p>
    </div>
  )
}

function titleFor(drill: Drill): string {
  switch (drill.kind) {
    case 'activity':
      return ACTIVITY_META[drill.activity].title
    case 'hour':
      return `${dayLabel(drill.time.slice(0, 10))} · ${timeLabel(drill.time)}`
    case 'day':
      return dayLabel(drill.date)
    case 'rain':
      return 'Precipitation'
    case 'outlook':
      return new Date(drill.day.date + 'T00:00:00').toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    case 'sun':
      return 'Sun & Daylight'
    case 'place':
      return 'Location'
    case 'alert':
      return 'Weather Alert'
  }
}

// --- Sun & daylight -----------------------------------------------------

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function addMinutes(iso: string, mins: number): Date {
  return new Date(new Date(iso).getTime() + mins * 60000)
}

function SunDetail({ bundle }: { bundle: WeatherBundle }) {
  const today = bundle.daily[0]
  const tomorrow = bundle.daily[1]
  if (!today) return null
  const rise = new Date(today.sunrise)
  const set = new Date(today.sunset)
  const solarNoon = new Date((rise.getTime() + set.getTime()) / 2)
  // Golden hour ≈ first/last hour of light; blue/civil twilight ≈ ±30 min.
  const dawn = addMinutes(today.sunrise, -30)
  const dusk = addMinutes(today.sunset, 30)
  const deltaSec = tomorrow ? tomorrow.daylightSeconds - today.daylightSeconds : 0
  const deltaMin = Math.round(Math.abs(deltaSec) / 60)

  return (
    <div className="drill">
      <div className="drill-hero">
        <span className="drill-hero-icon">☀️</span>
        <div>
          <div className="drill-hero-value">{fmtDuration(today.daylightSeconds)}</div>
          <div className="drill-hero-sub">of daylight today</div>
        </div>
      </div>
      <div className="drill-grid">
        <Stat label="Sunrise" value={timeLabel(today.sunrise)} />
        <Stat label="Sunset" value={timeLabel(today.sunset)} />
        <Stat label="Solar Noon" value={timeLabel(solarNoon.toISOString())} />
        <Stat
          label="Tomorrow"
          value={deltaSec === 0 ? 'Same' : `${deltaSec > 0 ? '+' : '−'}${deltaMin} min`}
        />
        <Stat label="First Light" value={timeLabel(dawn.toISOString())} />
        <Stat label="Last Light" value={timeLabel(dusk.toISOString())} />
      </div>
      <h3 className="drill-subtitle">Golden hour</h3>
      <div className="drill-grid">
        <Stat
          label="Morning"
          value={`${timeLabel(today.sunrise)}–${timeLabel(addMinutes(today.sunrise, 60).toISOString())}`}
        />
        <Stat
          label="Evening"
          value={`${timeLabel(addMinutes(today.sunset, -60).toISOString())}–${timeLabel(today.sunset)}`}
        />
      </div>
      <p className="drill-lead">
        {deltaSec === 0
          ? 'Day length is holding steady.'
          : `Days are getting ${deltaSec > 0 ? 'longer' : 'shorter'} by about ${deltaMin} minutes.`}{' '}
        Times shown in {bundle.location.timezone.replace(/_/g, ' ')}.
      </p>

    </div>
  )
}

// --- Location -----------------------------------------------------------

function PlaceDetail({ bundle, settings }: { bundle: WeatherBundle; settings: Settings }) {
  const loc = bundle.location
  const c = bundle.current
  const localTime = new Date().toLocaleTimeString('en-US', {
    timeZone: loc.timezone && loc.timezone !== 'auto' ? loc.timezone : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
  const place = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ')
  return (
    <div className="drill">
      <div className="drill-hero">
        <span className="drill-hero-icon">📍</span>
        <div>
          <div className="drill-hero-value" style={{ fontSize: 26 }}>
            {loc.name}
          </div>
          <div className="drill-hero-sub">{[loc.admin1, loc.country].filter(Boolean).join(', ')}</div>
        </div>
      </div>
      <div className="drill-grid">
        <Stat label="Local Time" value={localTime} />
        <Stat label="Now" value={`${formatTemp(c.temperature, settings.temperature)} · ${describe(c.weatherCode)}`} />
        <Stat label="Latitude" value={`${loc.latitude.toFixed(3)}°`} />
        <Stat label="Longitude" value={`${loc.longitude.toFixed(3)}°`} />
        <Stat label="Timezone" value={loc.timezone.replace(/_/g, ' ')} />
        <Stat label="Feels Like" value={formatTemp(c.apparentTemperature, settings.temperature)} />
      </div>
      <p className="drill-lead">{place}</p>
    </div>
  )
}

// --- Weather alert ------------------------------------------------------

function AlertDetail({ alert }: { alert: WeatherAlert }) {
  const levelLabel = alert.level === 'severe' ? 'Severe' : alert.level === 'warning' ? 'Warning' : 'Advisory'
  return (
    <div className="drill">
      <div className="drill-hero">
        <span className="drill-hero-icon">{alert.icon}</span>
        <div>
          <div className="drill-hero-value" style={{ fontSize: 24 }}>
            {alert.title}
          </div>
          <div className={`drill-alert-level drill-alert-${alert.level}`}>{levelLabel}</div>
        </div>
      </div>
      <p className="drill-lead">{alert.detail}</p>
      <p className="drill-hint">Derived from the current forecast for your area.</p>
    </div>
  )
}



export function DrillSheet({ drill, bundle, settings, onClose, onOpen }: Props) {
  return (
    <Sheet open={drill !== null} title={drill ? titleFor(drill) : ''} onClose={onClose}>
      {drill?.kind === 'activity' && (
        <ActivityDetail activity={drill.activity} bundle={bundle} settings={settings} onOpen={onOpen} />
      )}
      {drill?.kind === 'hour' && <HourDetail time={drill.time} bundle={bundle} settings={settings} />}
      {drill?.kind === 'day' && (
        <DayDetail date={drill.date} bundle={bundle} settings={settings} onOpen={onOpen} />
      )}
      {drill?.kind === 'rain' && <RainDetail bundle={bundle} settings={settings} onOpen={onOpen} />}
      {drill?.kind === 'outlook' && <OutlookDetail day={drill.day} settings={settings} />}
      {drill?.kind === 'sun' && <SunDetail bundle={bundle} />}
      {drill?.kind === 'place' && <PlaceDetail bundle={bundle} settings={settings} />}
      {drill?.kind === 'alert' && <AlertDetail alert={drill.alert} />}
    </Sheet>
  )
}
