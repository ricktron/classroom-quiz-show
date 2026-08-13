import {
  DESKTOP_DISPLAY_HASH,
  DESKTOP_ORIGIN,
  DESKTOP_PROTOCOL_HOST,
  DESKTOP_PROTOCOL_SCHEME,
} from './constants'

export function parseCqsAppUrl(urlString: string): URL | null {
  try {
    const url = new URL(urlString)
    if (url.protocol !== `${DESKTOP_PROTOCOL_SCHEME}:`) return null
    if (url.hostname !== DESKTOP_PROTOCOL_HOST) return null
    return url
  } catch {
    return null
  }
}

export function isCqsAppOrigin(originOrUrl: string): boolean {
  return parseCqsAppUrl(originOrUrl) !== null
}

function hashPath(url: URL): string {
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  const path = hash.startsWith('/') ? hash : `/${hash}`
  return path
}

export function isDisplayHashUrl(urlString: string): boolean {
  const url = parseCqsAppUrl(urlString)
  if (!url) return false
  const path = hashPath(url)
  const displayPath = DESKTOP_DISPLAY_HASH.slice(1)
  return path === displayPath || path.startsWith(`${displayPath}?`)
}

export function isHostHashUrl(urlString: string): boolean {
  const url = parseCqsAppUrl(urlString)
  if (!url) return false
  const path = hashPath(url)
  return path === '/host' || path.startsWith('/host?')
}

export function isAllowedDisplayWindowUrl(urlString: string): boolean {
  return isDisplayHashUrl(urlString)
}

export function isAllowedHostWindowNavigation(urlString: string): boolean {
  if (!isCqsAppOrigin(urlString)) return false
  return !isDisplayHashUrl(urlString)
}

export type WindowOpenDecision =
  | { readonly action: 'allow'; readonly kind: 'display' }
  | { readonly action: 'deny'; readonly reason: 'unexpected-window-open' }

export function decideWindowOpen(urlString: string): WindowOpenDecision {
  if (isAllowedDisplayWindowUrl(urlString)) {
    return { action: 'allow', kind: 'display' }
  }
  return { action: 'deny', reason: 'unexpected-window-open' }
}

export function displayFallbackUrl(): string {
  return `${DESKTOP_ORIGIN}/index.html${DESKTOP_DISPLAY_HASH}`
}
