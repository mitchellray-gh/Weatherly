import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path resolution:
//  - GitHub Pages serves the app under /Weatherly/, so that is the default.
//  - Vercel (and most other hosts) serve at the domain root, so use '/'.
//    Vercel sets the VERCEL env var automatically during the build.
//  - VITE_BASE overrides everything for any other host.
const base = process.env.VITE_BASE ?? (process.env.VERCEL ? '/' : '/Weatherly/')

declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  base,
  plugins: [react()],
})
