import { PDFDownloadLink } from '@react-pdf/renderer'
import type { WeatherBundle, Settings, DisasterEvent } from '../types'
import type { RiskResult } from '../lib/risk'
import { WeatherReportDocument } from './WeatherReport'

interface Props {
  bundle: WeatherBundle
  settings: Settings
  risk: RiskResult | null
  disasters: DisasterEvent[]
  onDone: () => void
}

export default function ReportPDFSection({ bundle, settings, risk, disasters, onDone }: Props) {
  return (
    <PDFDownloadLink
      document={
        <WeatherReportDocument
          bundle={bundle}
          settings={settings}
          risk={risk}
          disasters={disasters}
        />
      }
      fileName={`weatherly-report-${bundle.location.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`}
      onClick={onDone}
    >
      {({ loading }) => (
        <span className="rb-menu-item">
          {loading ? 'Preparing…' : '📥 Download PDF Report'}
        </span>
      )}
    </PDFDownloadLink>
  )
}
