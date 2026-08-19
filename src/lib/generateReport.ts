// Direct PDF generation and download (no rendered component needed).

import { pdf } from '@react-pdf/renderer'
import { WeatherReportDocument } from '../components/WeatherReport'
import type { WeatherBundle, Settings, DisasterEvent } from '../types'
import type { RiskResult } from '../lib/risk'

export async function generateReport(
  bundle: WeatherBundle,
  settings: Settings,
  risk: RiskResult | null,
  disasters: DisasterEvent[],
): Promise<void> {
  const doc = WeatherReportDocument({ bundle, settings, risk, disasters })
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `weatherly-report-${bundle.location.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
