import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If deploying to GitHub Pages at https://<user>.github.io/Weatherly/,
// the base must be '/Weatherly/'. Override with VITE_BASE for other hosts.
const base = process.env.VITE_BASE ?? '/Weatherly/'

declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  base,
  plugins: [react()],
})
