import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}']
      },
      manifest: {
        name: 'Arietta — a gentle piano teacher',
        short_name: 'Arietta',
        description: 'A gentle at-home piano teacher for beginners.',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#F1E9D8',
        theme_color: '#F1E9D8',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
