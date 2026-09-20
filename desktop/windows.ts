import {
  app,
  BrowserWindow,
  Menu,
  powerMonitor,
  screen,
  type BrowserWindowConstructorOptions,
  type HandlerDetails,
  type MenuItemConstructorOptions,
} from 'electron'
import {
  DESKTOP_DISPLAY_WINDOW_TITLE,
  DESKTOP_HOST_ENTRY_URL,
  DESKTOP_HOST_WINDOW_TITLE,
} from './constants'
import {
  decideAudienceDisplayPlacement,
  decideAudienceDisplayRescue,
  windowAlreadyOnPlacement,
  type AudienceDisplayPlacementDecision,
  type DisplayRect,
  type DisplayScreenInfo,
} from './displayPlacement'
import { DESKTOP_PRODUCT_NAME } from './identity'
import { DESKTOP_WEB_PREFERENCES } from './security'
import { createSystemResumeHandler } from './systemResumeRecovery'
import {
  decideWindowOpen,
  displayFallbackUrl,
  isAllowedDisplayWindowUrl,
  isAllowedHostWindowNavigation,
  isDisplayHashUrl,
} from './urls'

let hostWindow: BrowserWindow | null = null
let displayWindow: BrowserWindow | null = null
let lastGoodDisplayUrl = displayFallbackUrl()
let quitting = false
let systemResumeRecoveryInstalled = false
const onSystemResume = createSystemResumeHandler({
  isQuitting: () => quitting,
  getDisplayWindow: () => displayWindow,
  lastGoodDisplayUrl: () => lastGoodDisplayUrl,
  isAllowedDisplayUrl: isAllowedDisplayWindowUrl,
})


export function getHostWindow(): BrowserWindow | null {
  return hostWindow
}

export function getDisplayWindow(): BrowserWindow | null {
  return displayWindow
}

function hostBoundsOrFallback(): DisplayRect {
  if (hostWindow && !hostWindow.isDestroyed()) {
    return hostWindow.getBounds()
  }
  return { x: 0, y: 0, width: 1280, height: 800 }
}

function readDisplayScreens(): DisplayScreenInfo[] {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    bounds: d.bounds,
    workArea: d.workArea,
  }))
}

/** Exported for desktop unit tests that inject topology without Electron screen. */
export function decidePlacementForHost(
  displays: readonly DisplayScreenInfo[],
  hostBounds: DisplayRect,
): AudienceDisplayPlacementDecision {
  return decideAudienceDisplayPlacement({ displays, hostBounds })
}

function currentPlacementDecision(): AudienceDisplayPlacementDecision {
  return decidePlacementForHost(readDisplayScreens(), hostBoundsOrFallback())
}

function placementWindowOptions(): Pick<
  BrowserWindowConstructorOptions,
  'x' | 'y' | 'width' | 'height'
> {
  const decision = currentPlacementDecision()
  if (decision.kind !== 'place') return {}
  return {
    x: decision.bounds.x,
    y: decision.bounds.y,
    width: decision.bounds.width,
    height: decision.bounds.height,
  }
}

/**
 * Teacher-invoked Display recovery:
 * 1. Rescue if bounds lie outside every currently connected screen.
 * 2. Then apply intentional one-external placement when unambiguous.
 *
 * Ambiguous multi-external topologies still refuse projector guessing.
 * Already-correct / already-visible windows are left alone (focus/show only).
 */
function placeAudienceDisplayIfSafe(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  const displays = readDisplayScreens()
  const hostBounds = hostBoundsOrFallback()
  let current = win.getBounds()

  const rescue = decideAudienceDisplayRescue({
    displays,
    hostBounds,
    windowBounds: current,
  })
  if (rescue.kind === 'rescue') {
    win.setBounds({
      x: rescue.bounds.x,
      y: rescue.bounds.y,
      width: rescue.bounds.width,
      height: rescue.bounds.height,
    })
    current = rescue.bounds
  }

  const decision = decidePlacementForHost(displays, hostBounds)
  if (decision.kind !== 'place') return
  if (windowAlreadyOnPlacement(current, decision)) return
  win.setBounds({
    x: decision.bounds.x,
    y: decision.bounds.y,
    width: decision.bounds.width,
    height: decision.bounds.height,
  })
}

/**
 * Desktop OS resume: remount an open audience Display so it re-requests state.
 * Does not create a Display, reload Host, or open projector content unprompted.
 */
export function recoverAudienceDisplayAfterSystemResume(): void {
  onSystemResume()
}

/** Register Electron powerMonitor resume once for the desktop shell lifetime. */
export function installSystemResumeDisplayRecovery(): void {
  if (systemResumeRecoveryInstalled) return
  systemResumeRecoveryInstalled = true
  powerMonitor.on('resume', onSystemResume)
}

function attachDisplayLock(win: BrowserWindow): void {
  displayWindow = win
  win.setTitle(DESKTOP_DISPLAY_WINDOW_TITLE)
  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    if (displayWindow === win) displayWindow = null
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedDisplayWindowUrl(url)) event.preventDefault()
  })

  win.webContents.on('did-navigate-in-page', (_event, url) => {
    if (isAllowedDisplayWindowUrl(url)) {
      lastGoodDisplayUrl = url
      return
    }
    void win.loadURL(lastGoodDisplayUrl)
  })
}

function focusOrCreateDisplay(url: string): void {
  if (displayWindow && !displayWindow.isDestroyed()) {
    void displayWindow.loadURL(url)
    placeAudienceDisplayIfSafe(displayWindow)
    if (displayWindow.isMinimized()) displayWindow.restore()
    displayWindow.show()
    displayWindow.focus()
    return
  }
  const created = new BrowserWindow({
    title: DESKTOP_DISPLAY_WINDOW_TITLE,
    show: true,
    webPreferences: { ...DESKTOP_WEB_PREFERENCES },
    ...placementWindowOptions(),
  })
  attachDisplayLock(created)
  placeAudienceDisplayIfSafe(created)
  void created.loadURL(url)
}

export function handleWindowOpen(details: HandlerDetails): {
  action: 'allow' | 'deny'
  overrideBrowserWindowOptions?: BrowserWindowConstructorOptions
} {
  const decision = decideWindowOpen(details.url)
  if (decision.action === 'deny') {
    return { action: 'deny' }
  }
  if (displayWindow && !displayWindow.isDestroyed()) {
    focusOrCreateDisplay(details.url)
    return { action: 'deny' }
  }
  return {
    action: 'allow',
    overrideBrowserWindowOptions: {
      title: DESKTOP_DISPLAY_WINDOW_TITLE,
      webPreferences: { ...DESKTOP_WEB_PREFERENCES },
      ...placementWindowOptions(),
    },
  }
}

export function registerCreatedWindow(win: BrowserWindow, url: string): void {
  if (!isAllowedDisplayWindowUrl(url)) {
    win.destroy()
    return
  }
  attachDisplayLock(win)
  placeAudienceDisplayIfSafe(win)
}

export function createHostWindow(): BrowserWindow {
  hostWindow = new BrowserWindow({
    title: DESKTOP_HOST_WINDOW_TITLE,
    width: 1280,
    height: 800,
    show: true,
    webPreferences: { ...DESKTOP_WEB_PREFERENCES },
  })

  hostWindow.on('closed', () => {
    hostWindow = null
    if (quitting) return
    quitting = true
    if (displayWindow && !displayWindow.isDestroyed()) {
      displayWindow.close()
    }
    app.quit()
  })

  hostWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedHostWindowNavigation(url) && !isDisplayHashUrl(url)) {
      event.preventDefault()
    }
  })

  hostWindow.webContents.on('did-navigate-in-page', (_event, url) => {
    if (isDisplayHashUrl(url)) {
      focusOrCreateDisplay(url)
      void hostWindow?.loadURL(DESKTOP_HOST_ENTRY_URL)
    }
  })

  void hostWindow.loadURL(DESKTOP_HOST_ENTRY_URL)
  return hostWindow
}

export function installApplicationMenu(): void {
  const viewChildren: MenuItemConstructorOptions[] = [
    { role: 'togglefullscreen' },
  ]
  if (!app.isPackaged) {
    viewChildren.push({ role: 'reload' }, { role: 'toggleDevTools' })
  }
  const template: MenuItemConstructorOptions[] = [
    {
      label: DESKTOP_PRODUCT_NAME,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
    },
    {
      label: 'View',
      submenu: viewChildren,
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

export function focusHostWindow(): void {
  if (!hostWindow || hostWindow.isDestroyed()) return
  if (hostWindow.isMinimized()) hostWindow.restore()
  hostWindow.focus()
}
