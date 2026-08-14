/**
 * Hash-router leave guard for unsaved authoring.
 *
 * `useBlocker` requires a data router. CQS uses HashRouter (ADR-001), so
 * unexpected hash changes are reverted here instead.
 */

export function decideUnsavedHashLeave(args: {
  readonly dirty: boolean
  readonly allowLeave: boolean
  readonly allowedHash: string
  readonly nextHash: string
}): 'allow' | { readonly revertTo: string; readonly attempted: string } {
  if (!args.dirty || args.allowLeave) return 'allow'
  if (args.nextHash === args.allowedHash) return 'allow'
  return { revertTo: args.allowedHash, attempted: args.nextHash }
}

export function revertHash(allowedHash: string): void {
  const next = `${window.location.pathname}${window.location.search}${allowedHash}`
  window.history.replaceState(window.history.state, '', next)
}
