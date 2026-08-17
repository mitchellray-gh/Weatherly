import { useState } from 'react'
import type { WeatherLayerId } from '../types'
import { BASEMAP_STYLES, OVERLAY_DEFS, type BasemapStyleId, type OverlayId } from '../lib/basemap'
import { WEATHER_LAYER_DEFS } from '../lib/weatherLayers'
import './MapLayers.css'

interface Props {
  basemap: BasemapStyleId
  onBasemapChange: (id: BasemapStyleId) => void
  overlays: OverlayId[]
  onOverlaysChange: (ids: OverlayId[]) => void
  weatherLayer: WeatherLayerId | null
  onWeatherLayerChange: (id: WeatherLayerId | null) => void
  weatherOpacity: number
  onWeatherOpacityChange: (v: number) => void
}

export function MapLayers({
  basemap,
  onBasemapChange,
  overlays,
  onOverlaysChange,
  weatherLayer,
  onWeatherLayerChange,
  weatherOpacity,
  onWeatherOpacityChange,
}: Props) {
  const [open, setOpen] = useState(false)

  function toggleOverlay(id: OverlayId) {
    onOverlaysChange(overlays.includes(id) ? overlays.filter((o) => o !== id) : [...overlays, id])
  }

  return (
    <div className="ml-wrap">
      <button className="ml-btn" onClick={() => setOpen((o) => !o)} aria-label="Map layers">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>

      {open && (
        <>
          <div className="ml-backdrop" onClick={() => setOpen(false)} />
          <div className="ml-panel glass">
            <div className="ml-section">
              <div className="ml-section-title">Basemap</div>
              <div className="ml-basemap-row">
                {BASEMAP_STYLES.map((s) => (
                  <button
                    key={s.id}
                    className={`ml-basemap-btn ${basemap === s.id ? 'active' : ''}`}
                    onClick={() => onBasemapChange(s.id)}
                    aria-label={s.label}
                  >
                    <span className="ml-basemap-icon">{s.icon}</span>
                    <span className="ml-basemap-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-section">
              <div className="ml-section-title">Overlays</div>
              <div className="ml-chips">
                {OVERLAY_DEFS.map((o) => (
                  <button
                    key={o.id}
                    className={`ml-chip ${overlays.includes(o.id) ? 'active' : ''}`}
                    onClick={() => toggleOverlay(o.id)}
                  >
                    <span>{o.icon}</span> {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-section">
              <div className="ml-section-title">Weather</div>
              <div className="ml-chips">
                <button
                  className={`ml-chip ${weatherLayer === null ? 'active' : ''}`}
                  onClick={() => onWeatherLayerChange(null)}
                >
                  Off
                </button>
                {WEATHER_LAYER_DEFS.map((w) => (
                  <button
                    key={w.id}
                    className={`ml-chip ${weatherLayer === w.id ? 'active' : ''}`}
                    onClick={() => onWeatherLayerChange(w.id)}
                    style={weatherLayer === w.id ? { borderColor: w.color } : undefined}
                  >
                    <span>{w.icon}</span> {w.label}
                  </button>
                ))}
              </div>
              {weatherLayer && (
                <div className="ml-opacity">
                  <label className="ml-opacity-label">Opacity</label>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={weatherOpacity}
                    onChange={(e) => onWeatherOpacityChange(+e.target.value)}
                    className="ml-opacity-slider"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
