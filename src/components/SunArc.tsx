interface Props {
  sunrise: string // ISO
  sunset: string // ISO
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function SunArc({ sunrise, sunset }: Props) {
  const now = Date.now()
  const rise = new Date(sunrise).getTime()
  const set = new Date(sunset).getTime()
  const frac = Math.max(0, Math.min(1, (now - rise) / (set - rise)))

  const w = 200
  const h = 60
  const pad = 10
  const span = w - pad * 2
  // Arc: quadratic curve peaking in the middle.
  const px = pad + frac * span
  const py = h - (Math.sin(frac * Math.PI) * (h - 14) + 6)

  return (
    <div style={{ marginTop: 'auto', width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden>
        <path
          d={`M ${pad} ${h - 6} Q ${w / 2} ${-14} ${w - pad} ${h - 6}`}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeDasharray="3 4"
        />
        {frac > 0 && frac < 1 && (
          <circle cx={px} cy={py} r="5" fill="#ffd66b" stroke="#fff" strokeWidth="1.5" />
        )}
        <line x1={pad} y1={h - 6} x2={w - pad} y2={h - 6} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-faint)' }}>
        <span>{timeLabel(sunrise)}</span>
        <span>{timeLabel(sunset)}</span>
      </div>
    </div>
  )
}
