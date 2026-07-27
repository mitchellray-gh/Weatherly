import type { GeoLocation } from '../types'
import './SavedLocations.css'

interface Props {
  locations: GeoLocation[]
  activeId: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export function SavedLocations({ locations, activeId, onSelect, onRemove }: Props) {
  if (locations.length <= 1) return null
  return (
    <div className="saved no-scrollbar">
      {locations.map((loc) => (
        <div key={loc.id} className={`saved-chip ${loc.id === activeId ? 'active' : ''}`}>
          <button className="saved-name" onClick={() => onSelect(loc.id)}>
            {loc.name}
          </button>
          <button
            className="saved-x"
            onClick={() => onRemove(loc.id)}
            aria-label={`Remove ${loc.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
