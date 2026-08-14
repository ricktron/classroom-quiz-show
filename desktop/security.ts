import type { WebPreferences } from 'electron'

/**
 * Required BrowserWindow renderer posture for every CQS desktop window.
 * No preload is registered. Node and Electron APIs must stay unavailable
 * in both Host and Display renderers.
 */
export const DESKTOP_WEB_PREFERENCES: WebPreferences = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  navigateOnDragDrop: false,
}

export function assertSecureWebPreferences(prefs: WebPreferences): string[] {
  const failures: string[] = []
  if (prefs.nodeIntegration !== false) failures.push('nodeIntegration must be false')
  if (prefs.contextIsolation !== true) failures.push('contextIsolation must be true')
  if (prefs.sandbox !== true) failures.push('sandbox must be true')
  if (prefs.preload) failures.push('preload must not be registered')
  if (prefs.webSecurity === false) failures.push('webSecurity must remain enabled')
  if (prefs.allowRunningInsecureContent) {
    failures.push('allowRunningInsecureContent must be false')
  }
  return failures
}
