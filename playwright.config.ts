import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the PRODUCTION build served by `vite preview`.
 * `vite preview` serves the app under the same repository base path that
 * GitHub Pages uses (/classroom-quiz-show/), so these tests exercise the real
 * base-path and hash-routing behavior — not a dev-server approximation.
 *
 * The base URL therefore includes the repo base path; specs navigate to
 * hash routes like `#/host` and `#/display` relative to it.
 */
const PORT = 4173
const BASE_PATH = '/classroom-quiz-show/'

/**
 * Optional Chromium override. Set PLAYWRIGHT_CHROMIUM_PATH when the local
 * machine already has a Chromium build that Playwright's bundled version does
 * not match (e.g. a pre-provisioned CI/dev image). Left unset in normal CI,
 * where `npx playwright install chromium` provides the correct browser. Kept in
 * an env var so no machine-specific path is committed to the repository.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: 'desktop-1080p',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'projector-720p',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile-host',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    // Build then preview, so the served bundle matches what Pages deploys.
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
