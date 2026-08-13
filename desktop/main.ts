import { app, net, protocol, session } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESKTOP_CONTENT_SECURITY_POLICY } from './csp'
import { DESKTOP_PROTOCOL_SCHEME } from './constants'
import {
  DESKTOP_APP_ID,
  DESKTOP_PRODUCT_NAME,
} from './identity'
import {
  selectSonyHidDeviceId,
  shouldAllowHidPermissionCheck,
  shouldGrantHidDevicePermission,
} from './hid'
import { serveCqsRequest } from './protocol'
import {
  createHostWindow,
  focusHostWindow,
  handleWindowOpen,
  installApplicationMenu,
  registerCreatedWindow,
} from './windows'

protocol.registerSchemesAsPrivileged([
  {
    scheme: DESKTOP_PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

function applyDesktopIdentity(): void {
  app.setName(DESKTOP_PRODUCT_NAME)
  if (process.platform === 'win32') {
    app.setAppUserModelId(DESKTOP_APP_ID)
  }
  const isolatedUserData = process.env.CQS_USER_DATA
  if (isolatedUserData) {
    app.setPath('userData', isolatedUserData)
  }
}

function rendererRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../renderer')
}

function registerCustomProtocol(): void {
  const root = rendererRoot()
  protocol.handle(DESKTOP_PROTOCOL_SCHEME, (request) =>
    serveCqsRequest(request.url, root, (fileUrl) => net.fetch(fileUrl)),
  )
}

function installCspHeaderFallback(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    headers['Content-Security-Policy'] = [DESKTOP_CONTENT_SECURITY_POLICY]
    callback({ responseHeaders: headers })
  })
}

function usbId(value: string | number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : -1
  }
  return -1
}

function installHidHandlers(): void {
  const ses = session.defaultSession

  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    if (permission === 'hid') return shouldAllowHidPermissionCheck(requestingOrigin)
    return false
  })

  ses.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })

  ses.setDevicePermissionHandler((details) => {
    if (details.deviceType !== 'hid') return false
    return shouldGrantHidDevicePermission({
      origin: details.origin,
      deviceType: details.deviceType,
      device: {
        vendorId: usbId(details.device.vendorId),
        productId: usbId(details.device.productId),
      },
    })
  })

  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault()
    const deviceId = selectSonyHidDeviceId(
      details.deviceList.map((device) => ({
        deviceId: device.deviceId,
        vendorId: usbId(device.vendorId),
        productId: usbId(device.productId),
      })),
    )
    callback(deviceId ?? null)
  })
}

function installNavigationGuards(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler((details) => handleWindowOpen(details))
    contents.on('did-create-window', (win, details) => {
      registerCreatedWindow(win, details.url)
    })
    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
    })
  })
}

applyDesktopIdentity()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    focusHostWindow()
  })

  app.whenReady().then(() => {
    registerCustomProtocol()
    installCspHeaderFallback()
    installHidHandlers()
    installNavigationGuards()
    installApplicationMenu()
    app.setAboutPanelOptions({
      applicationName: DESKTOP_PRODUCT_NAME,
      applicationVersion: app.getVersion(),
    })
    createHostWindow()
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}
