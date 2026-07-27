import type { DayPoint, HourPoint, OutlookDay, Settings, WeatherBundle } from '../types'
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
  }
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
    </Sheet>
  )
}
