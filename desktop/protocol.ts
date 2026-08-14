import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DESKTOP_CONTENT_SECURITY_POLICY } from './csp'
import { parseCqsAppUrl } from './urls'

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

export function mimeForPath(filePath: string): string | null {
  return MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? null
}

function withSecurityHeaders(body: string | null, status: number, contentType: string): Response {
  const headers = new Headers()
  headers.set('Content-Security-Policy', DESKTOP_CONTENT_SECURITY_POLICY)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Content-Type', contentType)
  return new Response(body, { status, headers })
}

function rawPathContainsDotDot(requestUrl: string): boolean {
  const pathPart = requestUrl.split('#')[0]?.split('?')[0] ?? ''
  try {
    return decodeURIComponent(pathPart).split(/[/\\]/).includes('..')
  } catch {
    return true
  }
}

/**
 * Map a `cqs://app/...` request to a file under the desktop renderer root.
 * Returns null for the wrong origin or any path that would escape the root.
 */
export function resolveRendererFile(requestUrl: string, rendererRoot: string): string | null {
  const url = parseCqsAppUrl(requestUrl)
  if (!url) return null
  if (rawPathContainsDotDot(requestUrl)) return null

  let pathname = decodeURIComponent(url.pathname)
  if (!pathname || pathname === '/') pathname = '/index.html'
  if (pathname.split(/[/\\]/).includes('..')) return null

  const root = resolve(rendererRoot)
  const relativeRequest = pathname.replace(/^\/+/, '')
  const candidate = resolve(root, relativeRequest)
  const rel = relative(root, candidate)
  const escaped =
    rel.startsWith('..') || rel.split(sep).includes('..') || isAbsolute(rel)
  if (escaped) return null
  return candidate
}

export async function serveCqsRequest(
  requestUrl: string,
  rendererRoot: string,
  fetchFile: (fileUrl: string) => Promise<Response>,
): Promise<Response> {
  const filePath = resolveRendererFile(requestUrl, rendererRoot)
  if (!filePath) {
    return withSecurityHeaders('Forbidden', 403, 'text/plain; charset=utf-8')
  }

  try {
    const fileResponse = await fetchFile(pathToFileURL(filePath).href)
    if (!fileResponse.ok) {
      return withSecurityHeaders('Not found', 404, 'text/plain; charset=utf-8')
    }
    const headers = new Headers(fileResponse.headers)
    headers.set('Content-Security-Policy', DESKTOP_CONTENT_SECURITY_POLICY)
    headers.set('X-Content-Type-Options', 'nosniff')
    const mime = mimeForPath(filePath)
    if (mime) headers.set('Content-Type', mime)
    return new Response(fileResponse.body, { status: fileResponse.status, headers })
  } catch {
    return withSecurityHeaders('Not found', 404, 'text/plain; charset=utf-8')
  }
}
