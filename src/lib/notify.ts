// Browser notification wrapper for threshold alerts.

import type { ThresholdAlert } from './thresholds'
import { METRIC_LABELS, METRIC_UNITS, OP_LABELS } from './thresholds'

let permission: NotificationPermission = 'default'

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  permission = result
  return result
}

export function getNotificationPermission(): NotificationPermission {
  if ('Notification' in window) permission = Notification.permission
  return permission
}

export function sendThresholdNotification(alert: ThresholdAlert) {
  if (getNotificationPermission() !== 'granted') return

  const metricLabel = METRIC_LABELS[alert.metric]
  const unit = METRIC_UNITS[alert.metric]
  const opLabel = OP_LABELS[alert.op]

  const title = `⚡ ${alert.location.name}`
  const body = `${metricLabel} is ${Math.round(alert.actual * 10) / 10}${unit} — ${opLabel} ${alert.threshold}${unit}`

  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `threshold-${alert.ruleId}`,
      requireInteraction: false,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Notifications may be blocked by browser policy
  }
}
