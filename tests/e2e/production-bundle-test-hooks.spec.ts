import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Production-bundle guard (PKG-TESTLEAK): test-only simulator hooks must never
 * ship. The e2e suite runs against the production build served by
 * `vite preview`, so this crawls exactly what a teacher's browser receives:
 * index.html, the service worker, and every JS file they reference. Each
 * reference is resolved against the file it appears in, and every JS file in
 * the service worker precache must have been scanned.
 *
 * Forbidden: any `__cqs*` window global. The browser simulators in
 * tests/e2e/helpers install `__cqsWbuzzHidSim` and `__cqsFakeGamepads` via
 * addInitScript only; product code must not define or read them. Hooks under
 * other names are out of scope for this guard.
 *
 * Runs once, on the desktop project (the bundle is the same for every project).
 */
const FORBIDDEN_TEST_HOOK = /__cqs[A-Za-z]\w*/g

/** Quoted JS paths: "./x.js", "/base/assets/x.js", "assets/x.js", "x.js". */
const QUOTED_JS_REF = /["'`]((?:\.{1,2}\/|\/)?[\w@.\-/]*[\w-]\.js)["'`]/g
/** Workbox's AMD loader names dependencies without the extension: define(["./workbox-abc"], ...). */
const AMD_DEFINE_DEPS = /define\(\[([^\]]*)\]/g
const PRECACHE_URL = /url:\s*["']([^"']+)["']/g

/**
 * `vite preview` answers unknown paths with 200 + index.html (SPA fallback), so
 * status alone cannot prove a file exists: a `.js` URL counts only when it is
 * served as JavaScript.
 */
async function fetchText(request: APIRequestContext, url: string): Promise<string | null> {
  const response = await request.get(url)
  if (!response.ok()) return null
  const contentType = response.headers()['content-type'] ?? ''
  if (new URL(url).pathname.endsWith('.js') && !/javascript/i.test(contentType)) return null
  return response.text()
}

function jsReferences(text: string, from: string): string[] {
  const refs: string[] = []
  for (const match of text.matchAll(QUOTED_JS_REF)) refs.push(match[1]!)
  for (const match of text.matchAll(AMD_DEFINE_DEPS)) {
    for (const dep of match[1]!.matchAll(/["'](\.{1,2}\/[^"']+)["']/g)) {
      refs.push(dep[1]!.endsWith('.js') ? dep[1]! : `${dep[1]!}.js`)
    }
  }
  return refs.map((ref) => new URL(ref, from).href)
}

test('production bundle contains no test-only simulator hooks', async ({ request }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1080p',
    'The served bundle is identical across projects; scanned once.',
  )
  const baseURL = testInfo.project.use.baseURL
  expect(baseURL, 'project baseURL').toBeTruthy()
  const root = new URL('./', baseURL!).href
  const indexUrl = root
  const swUrl = new URL('sw.js', root).href

  const scanned = new Map<string, string>()
  const unresolved = new Set<string>()
  const queue: string[] = [indexUrl, swUrl]
  while (queue.length > 0) {
    const url = queue.shift()!
    if (scanned.has(url) || unresolved.has(url)) continue
    if (!url.startsWith(root)) continue
    const text = await fetchText(request, url)
    if (text === null) {
      unresolved.add(url)
      continue
    }
    scanned.set(url, text)
    for (const ref of jsReferences(text, url)) {
      if (!scanned.has(ref) && !unresolved.has(ref)) queue.push(ref)
    }
  }

  const label = (url: string) => url.slice(root.length) || 'index.html'
  testInfo.annotations.push({
    type: 'scanned',
    description: [...scanned.keys()].map(label).join(', '),
  })
  if (unresolved.size > 0) {
    testInfo.annotations.push({
      type: 'unresolved',
      description: [...unresolved].map(label).join(', '),
    })
  }
  expect(scanned.has(indexUrl), 'index.html scanned').toBe(true)
  const swText = scanned.get(swUrl)
  expect(swText, 'service worker scanned').toBeTruthy()
  // sw.js loads the Workbox runtime via define([...]); it is not in the
  // precache list, so prove the crawl reached it directly.
  expect(
    [...scanned.keys()].some((url) => /\/workbox-[0-9a-f]+\.js$/.test(url)),
    `Workbox runtime scanned: ${[...scanned.keys()].map(label).join(', ')}`,
  ).toBe(true)

  // Coverage: every JS file the service worker precaches was reached by the
  // crawl, so a split chunk cannot go unscanned.
  const precachedJs = [...swText!.matchAll(PRECACHE_URL)]
    .map((match) => new URL(match[1]!, swUrl).href)
    .filter((url) => url.endsWith('.js'))
  expect(
    precachedJs.some((url) => /\/assets\/index-[\w-]+\.js$/.test(url)),
    `precache lists the app entry chunk: ${precachedJs.map(label).join(', ')}`,
  ).toBe(true)
  const unscanned = precachedJs.filter((url) => !scanned.has(url)).map(label)
  expect(unscanned, 'precached JS not reached by the crawl').toEqual([])

  // Positive control: real product code was scanned, so an empty crawl cannot pass.
  expect(
    [...scanned.values()].some((text) => text.includes('Start Game')),
    'product strings present in scanned bundle',
  ).toBe(true)

  const leaks: string[] = []
  for (const [url, text] of scanned) {
    for (const hit of new Set(text.match(FORBIDDEN_TEST_HOOK) ?? [])) {
      leaks.push(`${label(url)}: ${hit}`)
    }
  }
  expect(leaks, 'test-only hooks found in the production bundle').toEqual([])
})
