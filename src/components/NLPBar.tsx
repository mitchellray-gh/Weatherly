import { useState } from 'react'
import { parseQuery } from '../lib/nlp'
import './NLPBar.css'

interface Props {
  onSearch: (query: ReturnType<typeof parseQuery>) => void
}

export function NLPBar({ onSearch }: Props) {
  const [text, setText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSearch(parseQuery(text.trim()))
  }

  return (
    <form className="nlp-bar" onSubmit={handleSubmit}>
      <span className="nlp-icon">🔍</span>
      <input
        className="nlp-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Try: "earthquakes near Tokyo past 7 days"'
      />
      {text && (
        <button type="button" className="nlp-clear" onClick={() => setText('')}>
          ✕
        </button>
      )}
    </form>
  )
}
