import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages serves this project under a repository base path
 * (https://<user>.github.io/classroom-quiz-show/). The base path is applied
 * only to the production build so local development stays at "/". It can be
 * overridden with the VITE_BASE environment variable (e.g. for a custom
 * domain deploy) without editing this file.
 *
 * See docs/architecture/ADR-001-github-pages-routing.md for the full rationale.
 */
const REPO_BASE = '/classroom-quiz-show/'

export default defineConfig(({ command, isPreview }) => {
  // Apply the repo base for production builds AND `vite preview` (which mirrors
  // GitHub Pages). `vite preview` reports command==='serve', so it must be
  // detected via isPreview — otherwise preview would serve at "/" while the
  // built HTML references "/classroom-quiz-show/". Local dev stays at "/".
  const useRepoBase = command === 'build' || isPreview === true
  const base = process.env.VITE_BASE ?? (useRepoBase ? REPO_BASE : '/')

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Precache the app shell. Offline support covers the shell + routes
        // only; no gameplay data is cached (there is no gameplay yet).
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
        },
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Classroom Quiz Show',
          short_name: 'Quiz Show',
          description:
            'A local-first classroom game-show engine for the projector and the teacher.',
          theme_color: '#0b1b2b',
          background_color: '#0b1b2b',
          display: 'standalone',
          orientation: 'landscape',
          categories: ['education'],
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
  }
})
