import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        basicSsl(),
        VitePWA({
          registerType: 'autoUpdate',
          // Cache de todos os assets da app (JS, CSS, imagens)
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            // Cache de tiles do OpenStreetMap para funcionar offline
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'osm-tiles-cache',
                  expiration: {
                    maxEntries: 2000,       // ~2000 tiles cacheados
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              // Cache de imagens do Supabase Storage
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'supabase-images-cache',
                  expiration: {
                    maxEntries: 500,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
          manifest: {
            name: 'PlantEye — Diagnóstico Silvícola',
            short_name: 'PlantEye',
            description: 'Diagnóstico fitossanitário de Eucalyptus globulus com IA, para técnicos florestais em campo.',
            theme_color: '#064E3B',
            background_color: '#064E3B',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            categories: ['utilities', 'productivity'],
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
              },
              {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
              {
                src: '/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
              },
            ],
            shortcuts: [
              {
                name: 'Novo Diagnóstico',
                short_name: 'Scan',
                description: 'Abrir câmara para diagnóstico',
                url: '/?tab=scan',
                icons: [{ src: '/icon-192.png', sizes: '192x192' }],
              },
              {
                name: 'Histórico',
                short_name: 'Histórico',
                description: 'Ver registos de campo',
                url: '/?tab=history',
                icons: [{ src: '/icon-192.png', sizes: '192x192' }],
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});