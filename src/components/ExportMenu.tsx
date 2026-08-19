import type { DisasterEvent } from '../types'
import { exportGeoJSON, exportCSV } from '../lib/export'
import './ExportMenu.css'

interface Props {
  events: DisasterEvent[]
}

export function ExportMenu({ events }: Props) {
  if (!events.length) return null

  return (
    <div className="export-menu">
      <button
        className="export-btn"
        onClick={() => exportGeoJSON(events)}
        title="Export as GeoJSON (QGIS, ArcGIS)"
      >
        📥 GeoJSON
      </button>
      <button
        className="export-btn"
        onClick={() => exportCSV(events)}
        title="Export as CSV (Excel, Google Sheets)"
      >
        📥 CSV
      </button>
    </div>
  )
}
