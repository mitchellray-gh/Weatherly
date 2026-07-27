import { useMemo, useState } from 'react'
import type { OutlookDay, Settings } from '../types'
import { cToUnit, formatTemp } from '../lib/units'
import { OutlookChart } from './OutlookChart'
import './YearOutlook.css'

interface Props {
  outlook: OutlookDay[]
  settings: Settings
}

interface MonthGroup {
  key: string
  label: string
  days: OutlookDay[]
}

function groupByMonth(outlook: OutlookDay[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const day of outlook) {
    const d = new Date(day.date + 'T00:00:00')
    const key = `${d.getFullYear()}-${d.getMonth()}`
    let g = groups.find((x) => x.key === key)
    if (!g) {
      g = { key, label: d.toLocaleDateString([], { month: 'long', year: 'numeric' }), days: [] }
      groups.push(g)
    }
    g.days.push(day)
  }
  return groups
}

export function YearOutlook({ outlook, settings }: Props) {
  const months = useMemo(() => groupByMonth(outlook), [outlook])
  const [activeIdx, setActiveIdx] = useState(0)
  const active = months[activeIdx]

  if (!active) return null

  // Heatmap color scale across the full year for context.
  const allMax = outlook.map((d) => cToUnit(d.tempMax, settings.temperature))
  const lo = Math.min(...allMax)
  const hi = Math.max(...allMax)

  function heatColor(tempC: number): string {
    const t = cToUnit(tempC, settings.temperature)
    const frac = hi > lo ? (t - lo) / (hi - lo) : 0.5
    const hue = 220 - frac * 220 // 220 (cold blue) → 0 (hot red)
    return `hsl(${hue}, 75%, 55%)`
  }

  const firstEstimate = active.days.find((d) => d.kind === 'estimate')
  const hasEstimates = Boolean(firstEstimate)

  return (
    <section className="year glass">
      <div className="year-head">
        <h2 className="section-title" style={{ margin: 0 }}>
          Year Outlook
        </h2>
        <div className="year-legend">
          <span className="year-legend-item">
            <span className="dot dot-forecast" /> Forecast
          </span>
          <span className="year-legend-item">
            <span className="dot dot-estimate" /> Climate estimate
          </span>
        </div>
      </div>

      <div className="year-months no-scrollbar">
        {months.map((m, i) => (
          <button
            key={m.key}
            className={`year-month ${i === activeIdx ? 'active' : ''}`}
            onClick={() => setActiveIdx(i)}
          >
            {m.label.split(' ')[0].slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="year-month-label">{active.label}</div>

      <OutlookChart days={active.days} settings={settings} />

      {hasEstimates && (
        <p className="year-disclaimer">
          Beyond ~16 days, values are climatological estimates (historical normals
          {settings.climateOverlay ? ' blended with CMIP6 climate projections' : ''}) with
          confidence bands — not a deterministic forecast.
        </p>
      )}

      <div className="year-calendar">
        {active.days.map((d) => {
          const date = new Date(d.date + 'T00:00:00')
          return (
            <div
              key={d.date}
              className={`year-cell ${d.kind}`}
              title={`${date.toLocaleDateString()} · ${formatTemp(d.tempMin, settings.temperature)}/${formatTemp(
                d.tempMax,
                settings.temperature,
              )}${d.kind === 'estimate' ? ' (estimate)' : ''}`}
            >
              <span className="year-cell-num">{date.getDate()}</span>
              <span className="year-cell-swatch" style={{ background: heatColor(d.tempMax) }} />
              <span className="year-cell-temp">{formatTemp(d.tempMax, settings.temperature, false)}°</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
