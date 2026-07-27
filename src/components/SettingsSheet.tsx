import type { Settings } from '../types'
import { ACTIVITIES, type ActivityCategory } from '../lib/activity'
import { Sheet } from './Sheet'

interface Props {
  open: boolean
  onClose: () => void
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsSheet({ open, onClose, settings, update }: Props) {
  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <div className="settings-row">
        <span className="settings-label">Appearance</span>
        <Segment
          value={settings.theme}
          options={[
            { value: 'auto', label: 'Vivid' },
            { value: 'book', label: 'Book' },
            { value: 'geo', label: 'Geo' },
          ]}
          onChange={(v) => update({ theme: v })}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">Temperature</span>
        <Segment
          value={settings.temperature}
          options={[
            { value: 'fahrenheit', label: '°F' },
            { value: 'celsius', label: '°C' },
          ]}
          onChange={(v) => update({ temperature: v })}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">Wind Speed</span>
        <Segment
          value={settings.wind}
          options={[
            { value: 'mph', label: 'mph' },
            { value: 'kmh', label: 'km/h' },
          ]}
          onChange={(v) => update({ wind: v })}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">Precipitation</span>
        <Segment
          value={settings.precip}
          options={[
            { value: 'inch', label: 'in' },
            { value: 'mm', label: 'mm' },
          ]}
          onChange={(v) => update({ precip: v })}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">Climate projection overlay</span>
        <Segment
          value={settings.climateOverlay ? 'on' : 'off'}
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
          onChange={(v) => update({ climateOverlay: v === 'on' })}
        />
      </div>

      <div className="settings-section-title">Activities</div>
      <p className="settings-note">
        Choose which activities appear in “Best Time to Get Outside”. Seasonal ones (like
        shovelling) only show when the weather calls for them.
      </p>
      <ActivityToggles settings={settings} update={update} />
    </Sheet>
  )
}

const CATEGORY_ORDER: ActivityCategory[] = [
  'Fitness',
  'Yard & Home',
  'Leisure',
  'Water',
  'Seasonal',
]

function ActivityToggles({
  settings,
  update,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}) {
  const enabled = new Set(settings.activities)

  function toggle(id: string) {
    const next = new Set(enabled)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update({ activities: [...next] })
  }

  return (
    <div className="activities">
      {CATEGORY_ORDER.map((cat) => {
        const items = ACTIVITIES.filter((a) => a.category === cat)
        if (items.length === 0) return null
        return (
          <div key={cat} className="activities-group">
            <div className="activities-cat">{cat}</div>
            <div className="activities-chips">
              {items.map((a) => (
                <button
                  key={a.id}
                  className={`activity-chip ${enabled.has(a.id) ? 'active' : ''}`}
                  onClick={() => toggle(a.id)}
                  aria-pressed={enabled.has(a.id)}
                >
                  <span className="activity-chip-emoji">{a.emoji}</span>
                  {a.title}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
