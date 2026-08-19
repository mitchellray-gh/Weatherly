import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE ?? (process.env.VERCEL ? '/' : '/Weatherly/')

declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Weatherly',
        short_name: 'Weatherly',
        description: 'Unified environmental intelligence — weather, climate, and natural disaster platform.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache Open-Meteo API responses
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'open-meteo-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 600 },
            },
          },
          {
            // Cache basemap tiles
            urlPattern: /^https:\/\/[abc]\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'basemap-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 7 },
            },
          },
          {
            // Cache ESRI tiles
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'esri-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 7 },
            },
          },
          {
            // Cache USGS disaster data
            urlPattern: /^https:\/\/earthquake\.usgs\.gov\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'usgs-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
})
