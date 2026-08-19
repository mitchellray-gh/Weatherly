import { useRef, useEffect, useState } from 'react'
import './ToolsMenu.css'

interface MenuItem {
  icon: string
  label: string
  onClick: () => void
}

interface Props {
  items: MenuItem[]
}

export function ToolsMenu({ items }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [open])

  return (
    <div className="tm-wrap" ref={ref}>
      <button
        className="tm-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Tools menu"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
      {open && (
        <div className="tm-dropdown">
          {items.map((item) => (
            <button
              key={item.label}
              className="tm-item"
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
            >
              <span className="tm-item-icon">{item.icon}</span>
              <span className="tm-item-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
