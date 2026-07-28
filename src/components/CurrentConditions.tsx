import type { CurrentConditions, DayPoint, GeoLocation, Settings } from '../types'
import { describe, iconFor } from '../lib/weatherCodes'
import { formatTemp } from '../lib/units'
import './CurrentConditions.css'

interface Props {
  location: GeoLocation
  current: CurrentConditions
  today: DayPoint | undefined
  settings: Settings
  onPlace: () => void
  onNow: () => void
  onFeels: () => void
  onToday: () => void
}

export function CurrentConditionsView({
  location,
  current,
  today,
  settings,
  onPlace,
  onNow,
  onFeels,
  onToday,
}: Props) {
  const place = [location.name, location.admin1].filter(Boolean).join(', ')
  return (
    <header className="cc">
      <button className="cc-place cc-tap" onClick={onPlace}>
        {place || 'Current Location'}
      </button>
      <button className="cc-temp cc-tap" onClick={onNow}>
        {formatTemp(current.temperature, settings.temperature)}
      </button>
      <button className="cc-cond cc-tap" onClick={onNow}>
        <span className="cc-icon">{iconFor(current.weatherCode, current.isDay)}</span>
        {describe(current.weatherCode)}
      </button>
      <div className="cc-hilo">
        {today && (
          <button className="cc-tap cc-hilo-btn" onClick={onToday}>
            <span>H:{formatTemp(today.tempMax, settings.temperature)}</span>
            <span>L:{formatTemp(today.tempMin, settings.temperature)}</span>
          </button>
        )}
        <button className="cc-feels cc-tap" onClick={onFeels}>
          Feels like {formatTemp(current.apparentTemperature, settings.temperature)}
        </button>
      </div>
    </header>
  )
}
