// Auto-generate PDF reports when severe disasters are detected.

import { useEffect, useRef, useState } from 'react'
import type { DisasterEvent } from '../types'

export interface AutoReportTrigger {
  event: DisasterEvent
  triggeredAt: number
}

const SEVERITY_THRESHOLD = 6 // M6+ earthquake
const CYCLONE_CATEGORIES = ['Cat 3', 'Cat 4', 'Cat 5', 'Category 3', 'Category 4', 'Category 5', 'Major']

export function useAutoReports(disasters: DisasterEvent[]): {
  triggers: AutoReportTrigger[]
  dismiss: (id: string) => void
} {
  const [triggers, setTriggers] = useState<AutoReportTrigger[]>([])
  const seen = useRef(new Set<string>())

  useEffect(() => {
    for (const d of disasters) {
      if (seen.current.has(d.id)) continue

      let severe = false

      // M6+ earthquake
      if (d.type === 'earthquake' && d.magnitude != null && d.magnitude >= SEVERITY_THRESHOLD) {
        severe = true
      }

      // Cat 3+ cyclone
      if (d.type === 'cyclone' && d.severity) {
        const s = d.severity.toLowerCase()
        if (CYCLONE_CATEGORIES.some((c) => s.includes(c.toLowerCase()))) {
          severe = true
        }
      }

      // Any "extreme" or "severe" disaster
      if (d.severity) {
        const s = d.severity.toLowerCase()
        if (s.includes('extreme') || s.includes('catastrophic')) {
          severe = true
        }
      }

      if (severe) {
        seen.current.add(d.id)
        setTriggers((prev) => [...prev, { event: d, triggeredAt: Date.now() }])
      }
    }
  }, [disasters])

  const dismiss = (id: string) => {
    setTriggers((prev) => prev.filter((t) => t.event.id !== id))
    seen.current.delete(id)
  }

  return { triggers, dismiss }
}
