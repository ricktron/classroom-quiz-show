/**
 * Durable Session identity for INIT_SESSION and completed-summary keys.
 */

export type CreateSessionId = () => string

let createSessionIdOverride: CreateSessionId | null = null

export function createSessionId(): string {
  if (createSessionIdOverride) return createSessionIdOverride()
  return crypto.randomUUID()
}

/** Test-only: inject deterministic session ids. Pass `null` to restore production behavior. */
export function setCreateSessionIdForTests(override: CreateSessionId | null): void {
  createSessionIdOverride = override
}

/** @deprecated Use {@link createSessionId}. Kept as alias for call-site clarity during migration. */
export function nextHostSessionId(): string {
  return createSessionId()
}

/** @deprecated Tests that reset counters should use {@link setCreateSessionIdForTests}. */
export function resetHostSessionIdCounterForTests(): void {
  createSessionIdOverride = null
}
