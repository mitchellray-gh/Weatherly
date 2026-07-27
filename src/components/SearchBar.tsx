import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GeoLocation } from '../types'
import { geocode, locationFromCoords } from '../lib/openMeteo'
import './SearchBar.css'

interface Props {
  onSelect: (loc: GeoLocation) => void
}

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoLocation[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    timer.current = window.setTimeout(async () => {
      try {
        setBusy(true)
        const r = await geocode(query)
        setResults(r)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setBusy(false)
      }
    }, 280)
    return () => window.clearTimeout(timer.current)
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function choose(loc: GeoLocation) {
    onSelect(loc)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = await locationFromCoords(pos.coords.latitude, pos.coords.longitude)
        choose(loc)
        setBusy(false)
      },
      () => setBusy(false),
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  return (
    <div className="search" ref={boxRef}>
      <div className="search-field glass">
        <span className="search-icon" aria-hidden>🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search for a city"
          aria-label="Search for a city"
          spellCheck={false}
        />
        <button className="search-loc" onClick={useMyLocation} title="Use my location" aria-label="Use my location">
          {busy ? '…' : '📍'}
        </button>
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            className="search-results glass"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {results.map((r) => (
              <li key={r.id}>
                <button onClick={() => choose(r)}>
                  <span className="sr-name">{r.name}</span>
                  <span className="sr-sub">
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
