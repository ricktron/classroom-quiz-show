import { defineConfig } from '@playwright/test'

/**
 * Electron shell tests. These do not use the GitHub Pages preview server.
 * The npm script builds the desktop renderer + main process first.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    trace: 'on-first-retry',
  },
})
