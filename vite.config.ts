import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

// Plugin: SPA fallback para vite preview (F5 en cualquier ruta)
function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Si la URL no tiene extensión → es una ruta SPA → servir index.html
        if (req.url && !req.url.includes('.')) {
          req.url = '/index.html'
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    spaFallbackPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Finanzas Vacío',
        short_name: 'Finanzas',
        description: 'Tu asistente financiero personal',
        theme_color: '#2563EB',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Clave para PWA: cualquier navegación sin match sirve index.html
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/rest/, /^\/auth/, /^\/storage/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ],
  resolve: {
    // path.resolve garantiza compatibilidad Windows/Unix
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
})
