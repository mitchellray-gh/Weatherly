import type { RiskResult } from '../lib/risk'
import './RiskBadge.css'

interface Props {
  risk: RiskResult | null
}

export function RiskBadge({ risk }: Props) {
  if (!risk) return null

  return (
    <div className="risk-badge" style={{ '--risk-color': risk.color } as React.CSSProperties}>
      <div className="risk-score">{risk.total}</div>
      <div className="risk-label">{risk.label} Risk</div>
      <div className="risk-bar">
        <div className="risk-bar-fill" style={{ width: `${risk.total}%` }} />
      </div>
    </div>
  )
}
