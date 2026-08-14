/**
 * Runtime flavor of this renderer build.
 *
 * Desktop packaging uses Vite `--mode desktop` which sets `VITE_CQS_RUNTIME`.
 * The web/PWA build leaves it unset. This is a packaging flag, not a second
 * game engine.
 */
export type CqsRuntime = 'web' | 'desktop'

export function cqsRuntime(): CqsRuntime {
  return import.meta.env.VITE_CQS_RUNTIME === 'desktop' ? 'desktop' : 'web'
}

export function isDesktopRuntime(): boolean {
  return cqsRuntime() === 'desktop'
}
