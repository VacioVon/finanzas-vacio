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
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        id: '/',
        name: 'Quemen los Barcos',
        short_name: 'QloB',
        description: 'Tu asistente financiero personal',
        lang: 'es',
        theme_color: '#1A1822',
        background_color: '#1A1822',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['icons/icon-512.png', 'icons/icon-maskable-512.png', '**/exceljs*.js'],
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
  build: {
    rollupOptions: {
      output: {
        // Librerías estables en archivos aparte: cargan en paralelo y, al desplegar cambios de la app,
        // el teléfono ya las tiene en caché (solo baja el código nuevo).
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (/node_modules\/(zod|react-hook-form|@hookform)\//.test(id)) return 'vendor-forms'
          return undefined
        }
      }
    }
  },
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
