import { useState } from 'react'
import type { WeatherBundle, Settings } from '../types'
import type { RiskResult } from '../lib/risk'
import type { DisasterEvent } from '../types'
import {
  loadEmailPrefs,
  saveEmailPrefs,
  sendEmailSummary,
  type EmailPreferences,
  type SummaryPayload,
} from '../lib/email'
import './EmailSettings.css'

interface Props {
  bundle: WeatherBundle | null
  settings: Settings
  risk: RiskResult | null
  disasters: DisasterEvent[]
}

export function EmailSettings({ bundle, settings, risk, disasters }: Props) {
  const [prefs, setPrefs] = useState<EmailPreferences>(loadEmailPrefs)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const update = (patch: Partial<EmailPreferences>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    saveEmailPrefs(next)
  }

  const handleTestSend = async () => {
    if (!bundle) return
    setSending(true)
    setResult(null)

    const payload: SummaryPayload = {
      location: `${bundle.location.name}${bundle.location.country ? `, ${bundle.location.country}` : ''}`,
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      temperature: settings.temperature === 'fahrenheit'
        ? `${Math.round(bundle.current.temperature * 9/5 + 32)}°F`
        : `${Math.round(bundle.current.temperature)}°C`,
      condition: weatherCodeLabel(bundle.current.weatherCode),
      wind: settings.wind === 'mph'
        ? `${Math.round(bundle.current.windSpeed * 0.621)} mph`
        : `${Math.round(bundle.current.windSpeed)} km/h`,
      humidity: `${bundle.current.humidity}%`,
      riskScore: risk?.total,
      riskLabel: risk?.label,
      disasterCount: disasters.length,
      topDisasters: disasters.slice(0, 5).map((d) => `${d.title} (${d.type})`),
    }

    const res = await sendEmailSummary(prefs, payload)
    setResult(res.message)
    setSending(false)
  }

  return (
    <div className="es">
      <h3>Email Summaries</h3>
      <p className="es-desc">Receive weather summaries in your inbox. Powered by Web3Forms (free).</p>

      <div className="es-form">
        <div className="es-row">
          <label>Web3Forms Access Key</label>
          <input
            type="text"
            className="es-input"
            value={prefs.accessKey}
            onChange={(e) => update({ accessKey: e.target.value })}
            placeholder="your-web3forms-key"
          />
          <a
            className="es-link"
            href="https://web3forms.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get free key ↗
          </a>
        </div>

        <div className="es-row">
          <label>Email Address</label>
          <input
            type="email"
            className="es-input"
            value={prefs.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>

        <div className="es-row">
          <label>Frequency</label>
          <div className="es-seg">
            <button
              className={prefs.frequency === 'daily' ? 'active' : ''}
              onClick={() => update({ frequency: 'daily' })}
            >
              Daily
            </button>
            <button
              className={prefs.frequency === 'weekly' ? 'active' : ''}
              onClick={() => update({ frequency: 'weekly' })}
            >
              Weekly
            </button>
          </div>
        </div>

        <div className="es-checks">
          <label className="es-check">
            <input
              type="checkbox"
              checked={prefs.includeForecast}
              onChange={(e) => update({ includeForecast: e.target.checked })}
            />
            Include forecast
          </label>
          <label className="es-check">
            <input
              type="checkbox"
              checked={prefs.includeDisasters}
              onChange={(e) => update({ includeDisasters: e.target.checked })}
            />
            Include disasters
          </label>
          <label className="es-check">
            <input
              type="checkbox"
              checked={prefs.includeRisk}
              onChange={(e) => update({ includeRisk: e.target.checked })}
            />
            Include risk score
          </label>
        </div>

        <button
          className="es-send-btn"
          onClick={handleTestSend}
          disabled={sending || !prefs.accessKey || !prefs.email}
        >
          {sending ? 'Sending…' : 'Send test summary'}
        </button>

        {result && <div className="es-result">{result}</div>}
      </div>
    </div>
  )
}

function weatherCodeLabel(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Moderate showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm',
  }
  return map[code] ?? `Code ${code}`
}
