import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DESKTOP_APP_ID,
  DESKTOP_PRODUCT_NAME,
  userDataIdentityIncludesVersion,
} from './identity'
import { DESKTOP_CONTENT_SECURITY_POLICY } from './csp'
import {
  DESKTOP_DISPLAY_ENTRY_URL,
  DESKTOP_HOST_ENTRY_URL,
  DESKTOP_ORIGIN,
  DESKTOP_PROTOCOL_HOST,
  DESKTOP_PROTOCOL_SCHEME,
  DESKTOP_SONY_PRODUCT_ID,
  DESKTOP_SONY_VENDOR_ID,
} from './constants'
import {
  isExactSupportedSonyHid,
  selectSonyHidDeviceId,
  shouldAllowHidPermissionCheck,
  shouldGrantHidDevicePermission,
} from './hid'
import { resolveRendererFile, mimeForPath, serveCqsRequest } from './protocol'
import { assertSecureWebPreferences, DESKTOP_WEB_PREFERENCES } from './security'
import {
  decideWindowOpen,
  isAllowedDisplayWindowUrl,
  isAllowedHostWindowNavigation,
  isCqsAppOrigin,
  isDisplayHashUrl,
  isHostHashUrl,
} from './urls'
import {
  SONY_BUZZ_SUPPORTED_PRODUCT_ID,
  SONY_BUZZ_SUPPORTED_VENDOR_ID,
} from '../src/input/sonyBuzzSupportedProfile'

describe('desktop application identity', () => {
  it('uses a stable appId and product name that do not include the version', () => {
    expect(DESKTOP_APP_ID).toBe('com.classroomquizshow.app')
    expect(DESKTOP_PRODUCT_NAME).toBe('Classroom Quiz Show')
    expect(userDataIdentityIncludesVersion(DESKTOP_APP_ID, DESKTOP_PRODUCT_NAME, '0.1.0')).toBe(
      false,
    )
    expect(userDataIdentityIncludesVersion(DESKTOP_APP_ID, DESKTOP_PRODUCT_NAME, '1.0.0')).toBe(
      false,
    )
  })
})

describe('custom protocol origin', () => {
  it('stabilizes cqs://app as the production origin', () => {
    expect(DESKTOP_PROTOCOL_SCHEME).toBe('cqs')
    expect(DESKTOP_PROTOCOL_HOST).toBe('app')
    expect(DESKTOP_ORIGIN).toBe('cqs://app')
    expect(DESKTOP_HOST_ENTRY_URL).toBe('cqs://app/index.html#/host')
    expect(DESKTOP_DISPLAY_ENTRY_URL).toBe('cqs://app/index.html#/display')
  })

  it('accepts only the app host on the cqs scheme', () => {
    expect(isCqsAppOrigin('cqs://app')).toBe(true)
    expect(isCqsAppOrigin('cqs://app/')).toBe(true)
    expect(isCqsAppOrigin('cqs://app/index.html#/host')).toBe(true)
    expect(isCqsAppOrigin('cqs://app.evil.example/')).toBe(false)
    expect(isCqsAppOrigin('file:///tmp/index.html')).toBe(false)
    expect(isCqsAppOrigin('https://ricktron.github.io/classroom-quiz-show/')).toBe(false)
  })
})

describe('Host / Display URL policy', () => {
  it('allows Display only as same-origin #/display', () => {
    expect(isDisplayHashUrl('cqs://app/#/display')).toBe(true)
    expect(isDisplayHashUrl('cqs://app/index.html#/display?theme=default')).toBe(true)
    expect(isDisplayHashUrl('cqs://app/#/host')).toBe(false)
    expect(isAllowedDisplayWindowUrl('cqs://app/#/display?theme=high-contrast')).toBe(true)
    expect(isAllowedDisplayWindowUrl('cqs://app/#/host')).toBe(false)
  })

  it('keeps Host on the custom origin and out of the Display hash', () => {
    expect(isHostHashUrl('cqs://app/index.html#/host')).toBe(true)
    expect(isAllowedHostWindowNavigation('cqs://app/#/host')).toBe(true)
    expect(isAllowedHostWindowNavigation('cqs://app/#/')).toBe(true)
    expect(isAllowedHostWindowNavigation('cqs://app/#/display')).toBe(false)
    expect(isAllowedHostWindowNavigation('https://example.com')).toBe(false)
  })

  it('denies unexpected window.open targets', () => {
    expect(decideWindowOpen('cqs://app/#/display?theme=default')).toEqual({
      action: 'allow',
      kind: 'display',
    })
    expect(decideWindowOpen('cqs://app/#/host')).toEqual({
      action: 'deny',
      reason: 'unexpected-window-open',
    })
    expect(decideWindowOpen('https://example.com')).toEqual({
      action: 'deny',
      reason: 'unexpected-window-open',
    })
    expect(decideWindowOpen('file:///etc/passwd')).toEqual({
      action: 'deny',
      reason: 'unexpected-window-open',
    })
  })
})

describe('renderer file mapping', () => {
  const root = join('/tmp', 'cqs-renderer')

  it('maps index and asset paths under the renderer root', () => {
    expect(resolveRendererFile('cqs://app/', root)).toBe(join(root, 'index.html'))
    expect(resolveRendererFile('cqs://app/index.html', root)).toBe(join(root, 'index.html'))
    expect(resolveRendererFile('cqs://app/assets/app.js', root)).toBe(join(root, 'assets', 'app.js'))
  })

  it('rejects traversal and non-app origins', () => {
    expect(resolveRendererFile('cqs://app/foo/%2e%2e/%2e%2e/etc/passwd', root)).toBeNull()
    expect(resolveRendererFile('file:///tmp/cqs-renderer/index.html', root)).toBeNull()
    expect(resolveRendererFile('cqs://other/index.html', root)).toBeNull()
  })

  it('attaches CSP and rejects unknown files through the protocol helper', async () => {
    const response = await serveCqsRequest(
      'cqs://app/missing.js',
      root,
      async () => new Response('nope', { status: 404 }),
    )
    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Security-Policy')).toBe(DESKTOP_CONTENT_SECURITY_POLICY)
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('serves known files with a restrictive CSP and no unsafe-eval', async () => {
    const response = await serveCqsRequest(
      'cqs://app/index.html',
      root,
      async () =>
        new Response('<html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('<html></html>')
    const csp = response.headers.get('Content-Security-Policy')
    expect(csp).toBe(DESKTOP_CONTENT_SECURITY_POLICY)
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('https:')
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(mimeForPath('/x/app.js')).toBe('text/javascript; charset=utf-8')
    expect(mimeForPath('/x/cue.wav')).toBe('audio/wav')
  })
})

describe('Sony HID restriction', () => {
  it('matches the in-app supported profile ids and no others', () => {
    expect(DESKTOP_SONY_VENDOR_ID).toBe(SONY_BUZZ_SUPPORTED_VENDOR_ID)
    expect(DESKTOP_SONY_PRODUCT_ID).toBe(SONY_BUZZ_SUPPORTED_PRODUCT_ID)
    expect(isExactSupportedSonyHid(0x054c, 0x1000)).toBe(true)
    expect(isExactSupportedSonyHid(0x054c, 0x0002)).toBe(false)
    expect(isExactSupportedSonyHid(0x054c, 0x1001)).toBe(false)
    expect(isExactSupportedSonyHid(0x045e, 0x1000)).toBe(false)
  })

  it('selects only the exact receiver from a mixed device list', () => {
    expect(
      selectSonyHidDeviceId([
        { deviceId: 'wired', vendorId: 0x054c, productId: 0x0002 },
        { deviceId: 'wbuzz', vendorId: 0x054c, productId: 0x1000 },
        { deviceId: 'other', vendorId: 0x1234, productId: 0x5678 },
      ]),
    ).toBe('wbuzz')
    expect(
      selectSonyHidDeviceId([{ deviceId: 'wired', vendorId: 0x054c, productId: 0x0002 }]),
    ).toBeUndefined()
  })

  it('grants HID only for cqs://app plus the exact Sony receiver', () => {
    expect(shouldAllowHidPermissionCheck('cqs://app/index.html#/host')).toBe(true)
    expect(shouldAllowHidPermissionCheck('https://example.com')).toBe(false)
    expect(
      shouldGrantHidDevicePermission({
        origin: 'cqs://app',
        deviceType: 'hid',
        device: { vendorId: 0x054c, productId: 0x1000 },
      }),
    ).toBe(true)
    expect(
      shouldGrantHidDevicePermission({
        origin: 'cqs://app',
        deviceType: 'hid',
        device: { vendorId: 0x054c, productId: 0x0002 },
      }),
    ).toBe(false)
    expect(
      shouldGrantHidDevicePermission({
        origin: 'https://evil.example',
        deviceType: 'hid',
        device: { vendorId: 0x054c, productId: 0x1000 },
      }),
    ).toBe(false)
    expect(
      shouldGrantHidDevicePermission({
        origin: 'cqs://app',
        deviceType: 'usb',
        device: { vendorId: 0x054c, productId: 0x1000 },
      }),
    ).toBe(false)
  })
})

describe('BrowserWindow security posture', () => {
  it('requires sandbox, context isolation, and no Node/preload', () => {
    expect(assertSecureWebPreferences(DESKTOP_WEB_PREFERENCES)).toEqual([])
    expect(
      assertSecureWebPreferences({
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false,
        preload: '/tmp/preload.js',
        webSecurity: false,
        allowRunningInsecureContent: true,
      }),
    ).toEqual([
      'nodeIntegration must be false',
      'contextIsolation must be true',
      'sandbox must be true',
      'preload must not be registered',
      'webSecurity must remain enabled',
      'allowRunningInsecureContent must be false',
    ])
  })
})
