import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  build: { outDir: mode === 'native' ? 'dist-native' : 'dist' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: mode === 'native',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      includeAssets: ['favicon.svg', 'pocket-ledger-icon.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        importScripts: ['/push-handler.js'],
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        runtimeCaching: [],
      },
    }),
  ],
}))
