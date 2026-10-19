import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Unit / component test configuration. The PWA plugin is intentionally omitted
 * here — service-worker generation is irrelevant to jsdom unit tests and only
 * slows them down. End-to-end (browser) behavior is covered by Playwright.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    __CQS_SOURCE_SHA__: JSON.stringify('vitest'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    /*
      Per-test spy isolation (test-trust repair).

      Vitest isolates a fresh jsdom per FILE, not per test, so a `vi.spyOn`
      that is never restored survives into every later test in the same file.
      That is not hypothetical here: of 21 `vi.spyOn` call sites, three files
      create more spies than they restore —
      `src/host/DiagnosticReportPanel.test.tsx` (1 spy / 0 restores),
      `src/host/useHostPersistence.test.tsx` (10 / 3) and
      `src/routes/HomeRoute.test.tsx` (2 / 1). The committed source order
      happened to hide all three, so CI never saw them; under
      `--sequence.shuffle --sequence.seed=2` the DiagnosticReportPanel leak
      turned a later test's real-clipboard assertion into "expected 'spy' to
      be called 1 times, but got 0 times" — the test stopped proving what its
      name claims rather than failing honestly.

      Restoring centrally rather than per file is what makes the class
      impossible instead of fixing one instance of it. It is safe by
      construction: every one of the 21 spies is created inside the `it` that
      uses it (no `beforeAll`, no describe- or module-level spy), so no test
      can be deprived of a spy it set up itself — only of one it was silently
      inheriting.

      `unstubGlobals` is deliberately NOT set. No measured defect traces to a
      leaked `vi.stubGlobal`, all seven files that stub globals already call
      `vi.unstubAllGlobals()` in a hook, and it would not have covered the
      other leak in the same test file anyway:
      `Object.defineProperty(navigator, 'clipboard', …)` is not a Vitest stub,
      so that descriptor is captured and restored in the test file itself.
    */
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          include: ['desktop/**/*.test.ts'],
          environment: 'node',
          setupFiles: [],
        },
      },
    ],
    // Playwright specs live under tests/e2e and tests/desktop and must not be
    // picked up by Vitest.
    exclude: ['tests/**', 'node_modules/**', 'dist/**', 'out/**', 'release/**'],
    css: false,
  },
})
