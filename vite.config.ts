/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Workspace',
          short_name: 'Workspace',
          description: 'Особистий робочий простір: розділи, канбан, нотатки, таблиці, завдання, календар.',
          theme_color: '#a855f7',
          background_color: '#0f0f13',
          display: 'standalone',
          start_url: '/app/home',
          icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/rest\//],
          runtimeCaching: supabaseUrl
            ? [
                {
                  // Cached GET responses let the app show last-known data
                  // when reopened offline; writes still require a connection.
                  urlPattern: new RegExp(`^${supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/rest/v1/.*`),
                  method: 'GET',
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'supabase-rest-cache',
                    networkTimeoutSeconds: 5,
                    expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ]
            : [],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
