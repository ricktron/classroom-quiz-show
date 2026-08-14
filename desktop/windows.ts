import {
  app,
  BrowserWindow,
  Menu,
  type BrowserWindowConstructorOptions,
  type HandlerDetails,
  type MenuItemConstructorOptions,
} from 'electron'
import {
  DESKTOP_DISPLAY_WINDOW_TITLE,
  DESKTOP_HOST_ENTRY_URL,
  DESKTOP_HOST_WINDOW_TITLE,
} from './constants'
import { DESKTOP_PRODUCT_NAME } from './identity'
import { DESKTOP_WEB_PREFERENCES } from './security'
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

export function getHostWindow(): BrowserWindow | null {
  return hostWindow
}

export function getDisplayWindow(): BrowserWindow | null {
  return displayWindow
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
    displayWindow.focus()
    return
  }
  const created = new BrowserWindow({
    title: DESKTOP_DISPLAY_WINDOW_TITLE,
    show: true,
    webPreferences: { ...DESKTOP_WEB_PREFERENCES },
  })
  attachDisplayLock(created)
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
    },
  }
}

export function registerCreatedWindow(win: BrowserWindow, url: string): void {
  if (!isAllowedDisplayWindowUrl(url)) {
    win.destroy()
    return
  }
  attachDisplayLock(win)
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
