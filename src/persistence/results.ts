export type PersistenceErrorCode =
  | 'unavailable'
  | 'transaction-failed'
  | 'not-found'
  | 'corrupt'
  | 'unsupported-version'
  | 'invalid'
  | 'conflict'
  | 'follower'
  | 'internal'
  | 'upgrade-blocked'
  | 'quota-exceeded'
  /** IndexedDB deleteDatabase was blocked by another open connection. */
  | 'delete-blocked'
  /** IndexedDB deleteDatabase failed (not blocked). */
  | 'delete-failed'

export type PersistenceOk<T> = { readonly ok: true; readonly value: T }
export type PersistenceErr = {
  readonly ok: false
  readonly code: PersistenceErrorCode
  readonly message: string
}
export type PersistenceResult<T> = PersistenceOk<T> | PersistenceErr

export function persistenceOk<T>(value: T): PersistenceOk<T> {
  return { ok: true, value }
}

export function persistenceErr(
  code: PersistenceErrorCode,
  message: string,
): PersistenceErr {
  return { ok: false, code, message }
}
