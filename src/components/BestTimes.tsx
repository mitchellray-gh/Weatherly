import type { HourPoint, Settings } from '../types'
import { findBestTimes, scoreLabel, type ActivityWindow } from '../lib/activity'
import { iconFor } from '../lib/weatherCodes'
import { formatTemp } from '../lib/units'
import './BestTimes.css'

interface Props {
  hourly: HourPoint[]
  settings: Settings
}

function whenLabel(time: Date, now: number): string {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const dayDiff = Math.round(
    (new Date(time).setHours(0, 0, 0, 0) - startOfToday.getTime()) / 86400000,
  )
  const hour = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  void now
  if (dayDiff === 0) return `Today · ${hour}`
  if (dayDiff === 1) return `Tomorrow · ${hour}`
  return `${time.toLocaleDateString([], { weekday: 'long' })} · ${hour}`
}

function Card({
  emoji,
  title,
  window,
  settings,
}: {
  emoji: string
  title: string
  window: ActivityWindow | null
  settings: Settings
}) {
  const now = Date.now()
  return (
    <div className="besttime glass">
      <div className="besttime-head">
        <span className="besttime-emoji">{emoji}</span>
        <span className="besttime-title">{title}</span>
      </div>
      {window ? (
        <>
          <div className="besttime-when">{whenLabel(window.time, now)}</div>
          <div className="besttime-meta">
            <span className="besttime-badge" data-tier={scoreLabel(window.score)}>
              {scoreLabel(window.score)}
            </span>
            <span className="besttime-cond">
              {iconFor(window.weatherCode, true)} {formatTemp(window.temperature, settings.temperature)}
            </span>
          </div>
        </>
      ) : (
        <div className="besttime-when besttime-none">No ideal window this week</div>
      )}
    </div>
  )
}

export function BestTimes({ hourly, settings }: Props) {
  const best = findBestTimes(hourly)
  if (!best.morningRun && !best.eveningWalk) return null

  return (
    <section className="besttimes">
      <h2 className="section-title">Best Time to Get Outside</h2>
      <div className="besttimes-grid">
        <Card emoji="🏃" title="Morning Run" window={best.morningRun} settings={settings} />
        <Card emoji="🚶" title="Evening Walk" window={best.eveningWalk} settings={settings} />
      </div>
    </section>
  )
}
