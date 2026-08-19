import { lazy, Suspense, useState } from 'react'
import type { WeatherBundle, Settings, DisasterEvent } from '../types'
import type { RiskResult } from '../lib/risk'
import './ReportButton.css'

const LazyPDFSection = lazy(() => import('./ReportPDFSection'))

interface Props {
  bundle: WeatherBundle | null
  settings: Settings
  risk: RiskResult | null
  disasters: DisasterEvent[]
}

export function ReportButton({ bundle, settings, risk, disasters }: Props) {
  const [showMenu, setShowMenu] = useState(false)

  if (!bundle) return null

  return (
    <div className="rb-wrap">
      <button className="rb-btn" onClick={() => setShowMenu(!showMenu)}>
        📄 Report
      </button>
      {showMenu && (
        <div className="rb-menu">
          <Suspense fallback={<span className="rb-menu-item">Loading…</span>}>
            <LazyPDFSection
              bundle={bundle}
              settings={settings}
              risk={risk}
              disasters={disasters}
              onDone={() => setShowMenu(false)}
            />
          </Suspense>
          <button
            className="rb-menu-item"
            onClick={() => {
              setShowMenu(false)
              window.print()
            }}
          >
            🖨️ Print page
          </button>
        </div>
      )}
    </div>
  )
}
