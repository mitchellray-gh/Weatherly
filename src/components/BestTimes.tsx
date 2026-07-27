import type { HourPoint, Settings } from '../types'
import { activitySuggestions, scoreLabel, type ActivitySuggestion } from '../lib/activity'
import { iconFor } from '../lib/weatherCodes'
import { formatTemp } from '../lib/units'
import './BestTimes.css'

interface Props {
  hourly: HourPoint[]
  settings: Settings
  onOpen: (activity: string) => void
}

function whenLabel(time: Date): string {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const dayDiff = Math.round(
    (new Date(time).setHours(0, 0, 0, 0) - startOfToday.getTime()) / 86400000,
  )
  const hour = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (dayDiff === 0) return `Today · ${hour}`
  if (dayDiff === 1) return `Tomorrow · ${hour}`
  return `${time.toLocaleDateString([], { weekday: 'long' })} · ${hour}`
}

function Card({
  s,
  settings,
  onClick,
}: {
  s: ActivitySuggestion
  settings: Settings
  onClick: () => void
}) {
  const { def, window } = s
  return (
    <button
      className={`besttime glass besttime-btn ${def.conditional ? 'besttime-alert' : ''}`}
      onClick={onClick}
    >
      <div className="besttime-head">
        <span className="besttime-emoji">{def.emoji}</span>
        <span className="besttime-title">{def.title}</span>
        <span className="besttime-chevron">›</span>
      </div>
      <div className="besttime-when">{whenLabel(window.time)}</div>
      <div className="besttime-meta">
        <span className="besttime-badge" data-tier={scoreLabel(window.score)}>
          {def.conditional ? 'Best window' : scoreLabel(window.score)}
        </span>
        <span className="besttime-cond">
          {iconFor(window.weatherCode, true)} {formatTemp(window.temperature, settings.temperature)}
        </span>
      </div>
    </button>
  )
}

export function BestTimes({ hourly, settings, onOpen }: Props) {
  const suggestions = activitySuggestions(hourly, settings.activities)
  if (suggestions.length === 0) return null

  return (
    <section className="besttimes">
      <h2 className="section-title">Best Time to Get Outside</h2>
      <div className="besttimes-grid">
        {suggestions.map((s) => (
          <Card key={s.def.id} s={s} settings={settings} onClick={() => onOpen(s.def.id)} />
        ))}
      </div>
    </section>
  )
}
