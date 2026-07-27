import type { Settings } from '../types'
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
    </Sheet>
  )
}
