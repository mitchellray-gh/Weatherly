import { AnimatePresence, motion } from 'framer-motion'
import type { AutoReportTrigger } from '../hooks/useAutoReports'
import { DISASTER_TYPE_LABELS } from '../lib/disasters'
import './AutoReportBanner.css'

interface Props {
  triggers: AutoReportTrigger[]
  onDismiss: (id: string) => void
  onDownload?: (eventId: string) => void
}

export function AutoReportBanner({ triggers, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {triggers.map((t) => (
        <motion.div
          key={t.event.id}
          className="arb-banner"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="arb-icon">⚡</div>
          <div className="arb-body">
            <div className="arb-title">
              Auto-Report Generated
            </div>
            <div className="arb-desc">
              {DISASTER_TYPE_LABELS[t.event.type]} — {t.event.title}
              {t.event.magnitude ? ` (M${t.event.magnitude})` : ''}
            </div>
          </div>
          <button className="arb-dismiss" onClick={() => onDismiss(t.event.id)}>
            ✕
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
