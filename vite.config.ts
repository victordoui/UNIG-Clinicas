import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,

      includeAssets: [
        'pwa-64x64.png',
        'pwa-72x72.png',
        'pwa-96x96.png',
        'pwa-144x144.png',
        'pwa-192x192.png',
        'pwa-384x384.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'apple-touch-icon-180x180.png',
        'favicon.ico',
        'robots.txt'
      ],
      manifest: {
        name: 'UNIG Clínicas — Plataforma Integrada',
        short_name: 'UNIG Clínicas',
        description: 'Plataforma integrada para atendimento, agenda, supervisão acadêmica e gestão das clínicas universitárias da UNIG.',
        theme_color: '#01413D',
        background_color: '#F6FAF9',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        categories: ['productivity', 'business'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'windows11/SmallTile.scale-100.png',
            sizes: '71x71',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'windows11/Square150x150Logo.scale-100.png',
            sizes: '150x150',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'windows11/Square150x150Logo.scale-125.png',
            sizes: '188x188',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'windows11/Square150x150Logo.scale-150.png',
            sizes: '225x225',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'windows11/Square150x150Logo.scale-200.png',
            sizes: '300x300',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'windows11/Square150x150Logo.scale-400.png',
            sizes: '600x600',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'windows11/Wide310x150Logo.scale-150.png',
            sizes: '465x225',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'windows11/LargeTile.scale-100.png',
            sizes: '310x310',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: 'mockups/dashboard-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard UNIG Clínicas'
          },
          {
            src: 'mockups/mobile-app.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'UNIG Clínicas Mobile'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-navigations',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 30 }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })

  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'chart-vendor': ['recharts'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
}));
