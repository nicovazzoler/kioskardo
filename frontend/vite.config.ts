import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    // `npm run dev:https`: certificado autofirmado para probar la cámara desde el celular.
    mode === 'https' && basicSsl(),
    react(),
    tailwindcss(),
    VitePWA({
      // Cuando hay una versión nueva, el service worker se actualiza solo sin preguntar.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Kioskardo',
        short_name: 'Kioskardo',
        description: 'Punto de venta para kioscos',
        lang: 'es-AR',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // La API nunca se cachea acá: los datos offline se manejan aparte, con IndexedDB.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    // host: true expone el server en la red local para probar desde el celular.
    host: true,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
}))
