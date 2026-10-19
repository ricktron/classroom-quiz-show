import { describe, expect, it } from 'vitest'

/**
 * FRC-7 — web storage does not survive between tests.
 *
 * Vitest isolates a fresh jsdom per FILE, not per test, so `sessionStorage` and
 * `localStorage` persisted across the `it`s in one file. That produced a
 * full-suite-only flake: `FoundationControls.test.tsx` writes
 * `cqs.buzzersWereReady:<sessionId>:<gameId>` via `rememberBuzzersReady`, and
 * the next test's `FoundationControls` read it back on mount, so whether it bit
 * depended on async settling order — which shifts with CPU contention.
 *
 * These two tests are ORDER-DEPENDENT ON PURPOSE: the first seeds both storages,
 * the second asserts the shared teardown emptied them. Without that teardown the
 * second fails. That is the only way to pin per-test isolation, since a clean
 * full run proves nothing about a leak that only sometimes bites.
 */

const KEY = 'frc7.isolation.probe'

describe('shared test teardown clears web storage', () => {
  it('seeds sessionStorage and localStorage', () => {
    sessionStorage.setItem(KEY, 'seeded')
    localStorage.setItem(KEY, 'seeded')
    expect(sessionStorage.getItem(KEY)).toBe('seeded')
    expect(localStorage.getItem(KEY)).toBe('seeded')
  })

  it('starts the next test with both storages empty', () => {
    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })
})
