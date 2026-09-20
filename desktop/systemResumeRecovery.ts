/**
 * Desktop OS suspend → resume catch-up for an open audience Display.
 *
 * Main-process only. Reloading the existing Display remounts the renderer so
 * the ordinary receiver mount path emits content-free `request-state`.
 * No IPC bridge, no preload, no private Host state in main.
 */

export interface SystemResumeDisplayWindow {
  isDestroyed(): boolean
  loadURL(url: string): void
  readonly webContents: {
    getURL(): string
    reload(): void
  }
}

export interface SystemResumeRecoveryDeps {
  readonly isQuitting: () => boolean
  readonly getDisplayWindow: () => SystemResumeDisplayWindow | null
  readonly lastGoodDisplayUrl: () => string
  readonly isAllowedDisplayUrl: (url: string) => boolean
}

/**
 * Returns a zero-arg handler suitable for Electron `powerMonitor.on('resume')`.
 * Safe no-op when quitting, Display missing/destroyed, or URL fails closed.
 */
export function createSystemResumeHandler(deps: SystemResumeRecoveryDeps): () => void {
  return () => {
    if (deps.isQuitting()) return
    const win = deps.getDisplayWindow()
    if (!win || win.isDestroyed()) return

    const currentUrl = win.webContents.getURL()
    if (deps.isAllowedDisplayUrl(currentUrl)) {
      win.webContents.reload()
      return
    }

    const fallback = deps.lastGoodDisplayUrl()
    if (deps.isAllowedDisplayUrl(fallback)) {
      win.loadURL(fallback)
    }
  }
}
