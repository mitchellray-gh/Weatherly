import { useMemo, useState } from 'react'
import type { DayPoint, OutlookDay, Settings } from '../types'
import { iconFor } from '../lib/weatherCodes'
import { cToUnit, formatTemp } from '../lib/units'
import './DailyList.css'

interface Props {
  daily: DayPoint[]
  /** Climatological estimate days (kind === 'estimate') beyond the forecast. */
  extension?: OutlookDay[]
  settings: Settings
  onSelect: (date: string) => void
  onSelectEstimate?: (day: OutlookDay) => void
}

const COLLAPSED_COUNT = 7
const EXTENDED_TOTAL = 30

interface Row {
  date: string
  weatherCode: number
  tempMax: number
  tempMin: number
  precipProb: number | null
  estimate: boolean
  outlook?: OutlookDay
}

function weekday(iso: string, i: number): string {
  if (i === 0) return 'Today'
  return new Date(iso + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })
}

function monthDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function DailyList({ daily, extension, settings, onSelect, onSelectEstimate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [show30, setShow30] = useState(false)

  const forecastRows: Row[] = useMemo(
    () =>
      daily.map((d) => ({
        date: d.date,
        weatherCode: d.weatherCode,
        tempMax: d.tempMax,
        tempMin: d.tempMin,
        precipProb: d.precipitationProbabilityMax,
        estimate: false,
      })),
    [daily],
  )

  const estimateRows: Row[] = useMemo(() => {
    if (!extension) return []
    const lastForecast = daily[daily.length - 1]?.date ?? ''
    return extension
      .filter((d) => d.date > lastForecast)
      .slice(0, Math.max(0, EXTENDED_TOTAL - daily.length))
      .map((d) => ({
        date: d.date,
        weatherCode: d.weatherCode,
        tempMax: d.tempMax,
        tempMin: d.tempMin,
        precipProb: d.precipitationProbability,
        estimate: true,
        outlook: d,
      }))
  }, [extension, daily])

  const hasExtension = estimateRows.length > 0
  const allRows = show30 && hasExtension ? [...forecastRows, ...estimateRows] : forecastRows

  if (daily.length === 0) return null

  // Temperature range across the visible rows for consistent bar scaling.
  const scaleRows = expanded || show30 ? allRows : forecastRows
  const mins = scaleRows.map((d) => cToUnit(d.tempMin, settings.temperature))
  const maxs = scaleRows.map((d) => cToUnit(d.tempMax, settings.temperature))
  const lo = Math.min(...mins)
  const hi = Math.max(...maxs)
  const span = Math.max(1, hi - lo)

  const collapsible = !show30 && allRows.length > COLLAPSED_COUNT
  const shown = collapsible && !expanded ? allRows.slice(0, COLLAPSED_COUNT) : allRows

  function handleClick(row: Row) {
    if (row.estimate && row.outlook && onSelectEstimate) onSelectEstimate(row.outlook)
    else onSelect(row.date)
  }

  return (
    <section className="daily glass">
      <div className="daily-head">
        <h2 className="section-title" style={{ margin: 0 }}>
          {show30 ? '30' : daily.length}-Day Forecast
        </h2>
        {hasExtension && (
          <div className="daily-seg">
            <button
              className={!show30 ? 'active' : ''}
              onClick={() => {
                setShow30(false)
                setExpanded(false)
              }}
            >
              16d
            </button>
            <button
              className={show30 ? 'active' : ''}
              onClick={() => setShow30(true)}
            >
              30d
            </button>
          </div>
        )}
      </div>

      <ul className="daily-list">
        {shown.map((d, i) => {
          const dMin = cToUnit(d.tempMin, settings.temperature)
          const dMax = cToUnit(d.tempMax, settings.temperature)
          const left = ((dMin - lo) / span) * 100
          const width = ((dMax - dMin) / span) * 100
          return (
            <li key={d.date}>
              <button
                className={`daily-row ${d.estimate ? 'daily-row-estimate' : ''}`}
                onClick={() => handleClick(d)}
              >
                <span className="daily-day">
                  {d.estimate ? monthDay(d.date) : weekday(d.date, i)}
                </span>
                <span className="daily-icon">{iconFor(d.weatherCode, true)}</span>
                <span className="daily-pop">
                  {d.precipProb != null && d.precipProb >= 10 ? `${Math.round(d.precipProb)}%` : ''}
                </span>
                <span className="daily-min">{formatTemp(d.tempMin, settings.temperature)}</span>
                <span className="daily-bar-track">
                  <span
                    className="daily-bar-fill"
                    style={{ left: `${left}%`, width: `${Math.max(6, width)}%` }}
                  />
                </span>
                <span className="daily-max">{formatTemp(d.tempMax, settings.temperature)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {collapsible && (
        <button className="daily-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `Show all ${forecastRows.length} days`}
        </button>
      )}

      {show30 && hasExtension && (
        <p className="daily-estimate-note">
          Days beyond 16 are climatological estimates (historical normals
          {settings.climateOverlay ? ' blended with climate projections' : ''}), not a
          deterministic forecast.
        </p>
      )}
    </section>
  )
}
