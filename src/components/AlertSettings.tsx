import { useState } from 'react'
import type { GeoLocation } from '../types'
import {
  type ThresholdRule,
  type ThresholdMetric,
  type ThresholdOp,
  METRIC_LABELS,
  METRIC_UNITS,
  OP_LABELS,
  getRules,
  addRule,
  updateRule,
  removeRule,
} from '../lib/thresholds'
import { requestNotificationPermission, getNotificationPermission } from '../lib/notify'
import './AlertSettings.css'

interface Props {
  locations: GeoLocation[]
  activeLocation?: GeoLocation
}

const METRICS: ThresholdMetric[] = [
  'temperature', 'feelsLike', 'windSpeed', 'windGusts',
  'precipitation', 'humidity', 'uvIndex', 'visibility', 'pressure', 'aqi',
]

const OPS: ThresholdOp[] = ['>', '<', '>=', '<=', '==']

const COOLDOWN_OPTIONS = [15, 30, 60, 120, 360]

export function AlertSettings({ locations, activeLocation }: Props) {
  const [rules, setRules] = useState<ThresholdRule[]>(getRules)
  const [adding, setAdding] = useState(false)
  const [editLoc, setEditLoc] = useState(activeLocation?.id ?? locations[0]?.id ?? '')
  const [editMetric, setEditMetric] = useState<ThresholdMetric>('windSpeed')
  const [editOp, setEditOp] = useState<ThresholdOp>('>')
  const [editValue, setEditValue] = useState('')
  const [editCooldown, setEditCooldown] = useState(60)
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission)

  const handleRequestNotif = async () => {
    const p = await requestNotificationPermission()
    setNotifPerm(p)
  }

  const handleAdd = () => {
    if (!editLoc || !editValue) return
    const val = parseFloat(editValue)
    if (isNaN(val)) return
    addRule({
      locationId: editLoc,
      metric: editMetric,
      op: editOp,
      value: val,
      cooldownMinutes: editCooldown,
    })
    setRules(getRules())
    setAdding(false)
    setEditValue('')
  }

  const handleToggle = (id: string, enabled: boolean) => {
    updateRule(id, { enabled })
    setRules(getRules())
  }

  const handleRemove = (id: string) => {
    removeRule(id)
    setRules(getRules())
  }

  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? id.slice(0, 10)

  return (
    <div className="as">
      <div className="as-header">
        <h3>Threshold Alerts</h3>
        {notifPerm !== 'granted' && (
          <button className="as-notif-btn" onClick={handleRequestNotif}>
            🔔 Enable notifications
          </button>
        )}
      </div>

      <p className="as-desc">
        Get browser notifications when conditions breach your thresholds.
      </p>

      {rules.length === 0 && !adding && (
        <div className="as-empty">No rules yet.</div>
      )}

      {rules.map((rule) => (
        <div key={rule.id} className={`as-rule ${!rule.enabled ? 'as-rule--off' : ''}`}>
          <div className="as-rule-main">
            <button
              className="as-toggle"
              onClick={() => handleToggle(rule.id, !rule.enabled)}
              aria-label={rule.enabled ? 'Disable' : 'Enable'}
            >
              {rule.enabled ? '🟢' : '⚪'}
            </button>
            <div className="as-rule-info">
              <div className="as-rule-condition">
                {METRIC_LABELS[rule.metric]} {OP_LABELS[rule.op]} {rule.value}{METRIC_UNITS[rule.metric]}
              </div>
              <div className="as-rule-meta">
                {locName(rule.locationId)} · cooldown {rule.cooldownMinutes}m
              </div>
            </div>
            <button className="as-remove" onClick={() => handleRemove(rule.id)} aria-label="Remove">
              ✕
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="as-form">
          <div className="as-form-row">
            <label>Location</label>
            <select value={editLoc} onChange={(e) => setEditLoc(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="as-form-row">
            <label>Metric</label>
            <select value={editMetric} onChange={(e) => setEditMetric(e.target.value as ThresholdMetric)}>
              {METRICS.map((m) => (
                <option key={m} value={m}>{METRIC_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <div className="as-form-row as-form-row--inline">
            <select value={editOp} onChange={(e) => setEditOp(e.target.value as ThresholdOp)}>
              {OPS.map((o) => (
                <option key={o} value={o}>{OP_LABELS[o]}</option>
              ))}
            </select>
            <input
              type="number"
              className="as-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="value"
            />
            <span className="as-unit">{METRIC_UNITS[editMetric]}</span>
          </div>
          <div className="as-form-row">
            <label>Cooldown</label>
            <div className="as-cooldown-btns">
              {COOLDOWN_OPTIONS.map((c) => (
                <button
                  key={c}
                  className={`as-cooldown-btn ${editCooldown === c ? 'active' : ''}`}
                  onClick={() => setEditCooldown(c)}
                >
                  {c < 60 ? `${c}m` : `${c / 60}h`}
                </button>
              ))}
            </div>
          </div>
          <div className="as-form-actions">
            <button className="as-cancel" onClick={() => setAdding(false)}>Cancel</button>
            <button className="as-save" onClick={handleAdd}>Add Rule</button>
          </div>
        </div>
      ) : (
        <button className="as-add-btn" onClick={() => setAdding(true)}>
          + Add alert rule
        </button>
      )}
    </div>
  )
}
