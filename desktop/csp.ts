/**
 * Restrictive Content-Security-Policy for the `cqs://` renderer origin.
 *
 * Script must remain file-backed (`'self'` only). Style `'unsafe-inline'` is
 * required for React inline `style=` attributes used by existing presentation
 * code. Do not add `'unsafe-eval'`, remote origins, or `bypassCSP`.
 */

export const DESKTOP_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob:",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join('; ')
