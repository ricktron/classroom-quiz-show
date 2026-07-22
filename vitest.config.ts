import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Unit / component test configuration. The PWA plugin is intentionally omitted
 * here — service-worker generation is irrelevant to jsdom unit tests and only
 * slows them down. End-to-end (browser) behavior is covered by Playwright.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Playwright specs live under tests/e2e and must not be picked up by Vitest.
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
    css: false,
  },
})
