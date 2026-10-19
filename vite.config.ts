import { readFileSync, statSync } from 'node:fs'
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

/**
 * Resolve this checkout's git directory.
 *
 * In an ordinary clone `.git` is a DIRECTORY. In a linked worktree
 * (`git worktree add`) it is a FILE holding `gitdir: <path>`, and reading
 * `.git/HEAD` therefore fails outright — which is why `sourceSha()` returned
 * `'unknown'` for every build made from a worktree, and why the Q5-A and Q7
 * desktop identity tests could not pass locally there. CI never saw it because
 * `GITHUB_SHA` is set and short-circuits above.
 */
function resolveGitDir(): string | null {
  const dotGit = resolve(here, '.git')
  try {
    if (statSync(dotGit).isDirectory()) return dotGit
  } catch {
    return null
  }
  // A worktree's gitdir pointer. `git` writes an absolute path here.
  const pointer = readFileOrNull(dotGit)?.trim()
  if (pointer === undefined || !pointer.startsWith('gitdir: ')) return null
  const target = pointer.slice('gitdir: '.length).trim()
  return target.length > 0 ? resolve(here, target) : null
}

/**
 * Read a ref, trying the worktree's own gitdir first and then the repository's
 * common directory.
 *
 * A linked worktree keeps `HEAD` locally but shares `refs/` and `packed-refs`
 * with the common dir, so a branch tip generally is NOT under its own gitdir.
 */
/** Read a file, or null when it is absent or unreadable. */
function readFileOrNull(path: string): string | null {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

/** The directories a ref may live in: this worktree's gitdir, then the common dir. */
function refSearchDirs(gitDir: string): string[] {
  // An ordinary clone has no `commondir`; its own gitdir IS the common dir.
  const commonDir = readFileOrNull(resolve(gitDir, 'commondir'))?.trim()
  return commonDir ? [gitDir, resolve(gitDir, commonDir)] : [gitDir]
}

/** Find `ref` in one directory's `packed-refs`. */
function readPackedRef(dir: string, ref: string): string | null {
  const packed = readFileOrNull(resolve(dir, 'packed-refs'))
  if (packed === null) return null
  for (const line of packed.split('\n')) {
    if (line.startsWith('#') || line.startsWith('^')) continue
    const [sha, name] = line.split(' ')
    if (name === ref && sha) return sha.trim()
  }
  return null
}

function readRef(gitDir: string, ref: string): string | null {
  for (const dir of refSearchDirs(gitDir)) {
    const loose = readFileOrNull(resolve(dir, ref))?.trim()
    if (loose) return loose
    const packed = readPackedRef(dir, ref)
    if (packed) return packed
  }
  return null
}

function sourceSha(): string {
  if (process.env.CQS_SOURCE_SHA && process.env.CQS_SOURCE_SHA.length > 0) {
    return process.env.CQS_SOURCE_SHA
  }
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA.length > 0) {
    return process.env.GITHUB_SHA
  }
  try {
    const gitDir = resolveGitDir()
    if (gitDir === null) return 'unknown'
    const head = readFileSync(resolve(gitDir, 'HEAD'), 'utf8').trim()
    // Detached HEAD (what a pinned preflight worktree uses) is the sha itself.
    if (!head.startsWith('ref: ')) return head
    const ref = head.slice('ref: '.length).trim()
    if (ref.includes('..') || ref.startsWith('/') || ref.includes('\\')) {
      return 'unknown'
    }
    return readRef(gitDir, ref) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function resolveViteBase(isDesktop: boolean, useRepoBase: boolean): string {
  if (isDesktop) return '/'
  if (process.env.VITE_BASE && process.env.VITE_BASE.length > 0) {
    return process.env.VITE_BASE
  }
  return useRepoBase ? REPO_BASE : '/'
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
  const base = resolveViteBase(isDesktop, useRepoBase)

  return {
    base,
    // Q7-DIAG-1: bind exact source SHA into the renderer for diagnostic traces.
    define: {
      __CQS_SOURCE_SHA__: JSON.stringify(sourceSha()),
    },
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
