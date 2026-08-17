import type { WeatherLayerId } from '../types'
import './LayerLegend.css'

interface Props {
  layer: WeatherLayerId | null
}

interface ScaleStop {
  label: string
  color: string
}

const SCALES: Record<WeatherLayerId, { title: string; stops: ScaleStop[] }> = {
  precipitation: {
    title: 'Precipitation',
    stops: [
      { label: '0.1', color: 'rgb(80,170,255)' },
      { label: '0.5', color: 'rgb(56,214,122)' },
      { label: '1.5', color: 'rgb(240,216,90)' },
      { label: '4', color: 'rgb(244,150,60)' },
      { label: '8', color: 'rgb(232,74,74)' },
      { label: '16+', color: 'rgb(200,80,220)' },
    ],
  },
  wind: {
    title: 'Wind Speed',
    stops: [
      { label: '0', color: 'rgb(100,200,255)' },
      { label: '20', color: 'rgb(80,180,240)' },
      { label: '40', color: 'rgb(120,220,120)' },
      { label: '60', color: 'rgb(240,220,80)' },
      { label: '80', color: 'rgb(240,140,50)' },
      { label: '120+', color: 'rgb(220,60,60)' },
    ],
  },
  temperature: {
    title: 'Temperature',
    stops: [
      { label: '-20°', color: 'rgb(60,80,200)' },
      { label: '-10°', color: 'rgb(80,140,240)' },
      { label: '0°', color: 'rgb(100,200,240)' },
      { label: '10°', color: 'rgb(140,220,140)' },
      { label: '20°', color: 'rgb(240,220,80)' },
      { label: '30°', color: 'rgb(240,140,50)' },
      { label: '40°', color: 'rgb(220,60,40)' },
    ],
  },
  cloud: {
    title: 'Cloud Cover',
    stops: [
      { label: '0%', color: 'rgb(80,80,80)' },
      { label: '25%', color: 'rgb(120,120,130)' },
      { label: '50%', color: 'rgb(160,160,170)' },
      { label: '75%', color: 'rgb(190,195,200)' },
      { label: '100%', color: 'rgb(220,225,230)' },
    ],
  },
  pressure: {
    title: 'Pressure',
    stops: [
      { label: '980', color: 'rgb(180,80,80)' },
      { label: '1000', color: 'rgb(200,160,80)' },
      { label: '1013', color: 'rgb(140,180,220)' },
      { label: '1025', color: 'rgb(80,140,220)' },
      { label: '1040', color: 'rgb(60,100,200)' },
    ],
  },
  snow: {
    title: 'Snowfall',
    stops: [
      { label: '0.1', color: 'rgb(200,220,255)' },
      { label: '1', color: 'rgb(160,200,255)' },
      { label: '3', color: 'rgb(120,170,240)' },
      { label: '6', color: 'rgb(80,140,220)' },
      { label: '10+', color: 'rgb(60,100,200)' },
    ],
  },
}

const UNITS: Record<WeatherLayerId, string> = {
  precipitation: 'mm/h',
  wind: 'km/h',
  temperature: '°C',
  cloud: '',
  pressure: 'hPa',
  snow: 'cm',
}

export function LayerLegend({ layer }: Props) {
  if (!layer) {
    // Default precipitation legend.
    const scale = SCALES.precipitation
    return (
      <div className="layer-legend">
        <span className="layer-legend-title">Precipitation</span>
        <div className="layer-legend-bar-wrap">
          <span className="layer-legend-label">Light</span>
          <div
            className="layer-legend-bar"
            style={{
              background: `linear-gradient(90deg, ${scale.stops.map((s) => s.color).join(', ')})`,
            }}
          />
          <span className="layer-legend-label">Heavy</span>
        </div>
        <div className="layer-legend-ticks">
          {scale.stops.map((s, i) => (
            <span key={i} className="layer-legend-tick" style={{ left: `${(i / (scale.stops.length - 1)) * 100}%` }}>
              {s.label}
            </span>
          ))}
        </div>
        <span className="layer-legend-unit">mm/h</span>
      </div>
    )
  }

  const scale = SCALES[layer]
  const unit = UNITS[layer]

  return (
    <div className="layer-legend">
      <span className="layer-legend-title">{scale.title}</span>
      <div className="layer-legend-bar-wrap">
        <span className="layer-legend-label">{scale.stops[0].label}</span>
        <div
          className="layer-legend-bar"
          style={{
            background: `linear-gradient(90deg, ${scale.stops.map((s) => s.color).join(', ')})`,
          }}
        />
        <span className="layer-legend-label">{scale.stops[scale.stops.length - 1].label}</span>
      </div>
      <div className="layer-legend-ticks">
        {scale.stops.map((s, i) => (
          <span key={i} className="layer-legend-tick" style={{ left: `${(i / (scale.stops.length - 1)) * 100}%` }}>
            {s.label}
          </span>
        ))}
      </div>
      {unit && <span className="layer-legend-unit">{unit}</span>}
      {layer === 'wind' && (
        <div className="layer-legend-note">Arrows show wind direction, color shows speed</div>
      )}
    </div>
  )
}
