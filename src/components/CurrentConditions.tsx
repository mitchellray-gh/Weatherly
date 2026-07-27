import type { CurrentConditions, DayPoint, GeoLocation, Settings } from '../types'
import { describe, iconFor } from '../lib/weatherCodes'
import { formatTemp } from '../lib/units'
import './CurrentConditions.css'

interface Props {
  location: GeoLocation
  current: CurrentConditions
  today: DayPoint | undefined
  settings: Settings
}

export function CurrentConditionsView({ location, current, today, settings }: Props) {
  const place = [location.name, location.admin1].filter(Boolean).join(', ')
  return (
    <header className="cc">
      <div className="cc-place">{place || 'Current Location'}</div>
      <div className="cc-temp">
        {formatTemp(current.temperature, settings.temperature)}
      </div>
      <div className="cc-cond">
        <span className="cc-icon">{iconFor(current.weatherCode, current.isDay)}</span>
        {describe(current.weatherCode)}
      </div>
      <div className="cc-hilo">
        {today && (
          <>
            <span>H:{formatTemp(today.tempMax, settings.temperature)}</span>
            <span>L:{formatTemp(today.tempMin, settings.temperature)}</span>
          </>
        )}
        <span className="cc-feels">
          Feels like {formatTemp(current.apparentTemperature, settings.temperature)}
        </span>
      </div>
    </header>
  )
}
