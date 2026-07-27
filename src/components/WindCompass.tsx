interface Props {
  direction: number // degrees, direction wind is coming FROM
  size?: number
}

export function WindCompass({ direction, size = 62 }: Props) {
  const r = size / 2
  const inner = r - 8
  // Arrow points in the direction the wind blows TO.
  const angle = (direction + 180) % 360
  const rad = ((angle - 90) * Math.PI) / 180
  const x = r + inner * Math.cos(rad)
  const y = r + inner * Math.sin(rad)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={r} cy={r} r={r - 1} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" />
      {['N', 'E', 'S', 'W'].map((label, i) => {
        const a = ((i * 90 - 90) * Math.PI) / 180
        const lx = r + (r - 9) * Math.cos(a)
        const ly = r + (r - 9) * Math.sin(a)
        return (
          <text
            key={label}
            x={lx}
            y={ly + 3}
            fontSize="8"
            textAnchor="middle"
            fill="rgba(255,255,255,0.6)"
          >
            {label}
          </text>
        )
      })}
      <line x1={r} y1={r} x2={x} y2={y} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={r} cy={r} r="2.5" fill="#fff" />
    </svg>
  )
}
