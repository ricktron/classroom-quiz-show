import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages serves this project under a repository base path
 * (https://<user>.github.io/classroom-quiz-show/). The base path is applied
 * only to the production web build so local development stays at "/". It can be
 * overridden with the VITE_BASE environment variable (e.g. for a custom
 * domain deploy) without editing this file.
 *
 * Desktop packaging uses `--mode desktop` with `base: '/'` so
 * `absoluteHashUrl` stays valid at `cqs://app/#/host` and `#/display`.
 * Do not use `base: './'` for the desktop renderer (ADR-021).
 *
 * See docs/architecture/ADR-001-github-pages-routing.md for the web rationale.
 */
const REPO_BASE = '/classroom-quiz-show/'
const here = dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(
  readFileSync(resolve(here, 'package.json'), 'utf8'),
) as { version: string }

function sourceSha(): string {
  if (process.env.CQS_SOURCE_SHA && process.env.CQS_SOURCE_SHA.length > 0) {
    return process.env.CQS_SOURCE_SHA
  }
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA.length > 0) {
    return process.env.GITHUB_SHA
  }
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function desktopBuildIdentityPlugin(): Plugin {
  return {
    name: 'cqs-desktop-build-identity',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'desktop-build-identity.json',
        source: JSON.stringify(
          {
            productName: 'Classroom Quiz Show',
            appId: 'com.classroomquizshow.app',
            version: packageJson.version,
            sourceSha: sourceSha(),
            runtime: 'electron',
            protocol: 'cqs://app',
            updateModel: 'manual-versioned-replacement',
          },
          null,
          2,
        ),
      })
    },
  }
}

export default defineConfig(({ command, isPreview, mode }) => {
  const isDesktop = mode === 'desktop'
  // Apply the repo base for production web builds AND `vite preview` (which
  // mirrors GitHub Pages). `vite preview` reports command==='serve', so it
  // must be detected via isPreview — otherwise preview would serve at "/"
  // while the built HTML references "/classroom-quiz-show/". Local dev stays
  // at "/". Desktop builds force "/" for the custom-scheme origin.
  const useRepoBase = !isDesktop && (command === 'build' || isPreview === true)
  const base = isDesktop ? '/' : (process.env.VITE_BASE ?? (useRepoBase ? REPO_BASE : '/'))

  return {
    base,
    build: isDesktop
      ? {
          outDir: 'out/renderer',
          emptyOutDir: true,
        }
      : undefined,
    plugins: [
      react(),
      ...(isDesktop ? [desktopBuildIdentityPlugin()] : []),
      VitePWA({
        disable: isDesktop,
        registerType: 'autoUpdate',
        // Precache the app shell. Offline support covers the shell + routes
        // only; no gameplay data is cached (there is no gameplay yet).
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,wav}'],
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
