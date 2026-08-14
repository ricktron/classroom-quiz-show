import { expect, test, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolveRepoRoot()

function resolveRepoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../..')
}

async function launchDesktop(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    cwd: repoRoot,
    args: [repoRoot],
    env: {
      ...process.env,
      CQS_USER_DATA: userDataDir,
    },
    timeout: 60_000,
  })
}

async function hostWindow(app: ElectronApplication): Promise<Page> {
  const page = await app.firstWindow()
  await expect(page.getByRole('heading', { name: /host control/i })).toBeVisible({
    timeout: 30_000,
  })
  return page
}

function isolationProbe() {
  const w = window as unknown as {
    require?: unknown
    process?: unknown
    electron?: unknown
  }
  return {
    requireDefined: typeof w.require !== 'undefined',
    processDefined: typeof w.process !== 'undefined',
    electronExposed: typeof w.electron !== 'undefined',
    origin: window.location.origin,
    href: window.location.href,
  }
}

test.describe.configure({ mode: 'serial' })

test.describe('Electron thin shell', () => {
  test('opens Host at cqs://app, Display as a second window, and keeps the security boundary', async () => {
    const userData = mkdtempSync(join(tmpdir(), 'cqs-s03-lifecycle-'))
    const app = await launchDesktop(userData)
    try {
      const host = await hostWindow(app)
      const hostProbe = await host.evaluate(isolationProbe)
      expect(hostProbe.origin).toBe('cqs://app')
      expect(hostProbe.href).toContain('#/host')
      expect(hostProbe.requireDefined).toBe(false)
      expect(hostProbe.processDefined).toBe(false)
      expect(hostProbe.electronExposed).toBe(false)
      await expect(host.getByText(/private teacher controls/i)).toBeVisible()

      const identity = await host.evaluate(async () => {
        const res = await fetch('cqs://app/desktop-build-identity.json')
        return {
          ok: res.ok,
          csp: res.headers.get('content-security-policy'),
          body: (await res.json()) as {
            appId: string
            protocol: string
            runtime: string
            updateModel: string
          },
        }
      })
      expect(identity.ok).toBe(true)
      expect(identity.body.appId).toBe('com.classroomquizshow.app')
      expect(identity.body.protocol).toBe('cqs://app')
      expect(identity.body.runtime).toBe('electron')
      expect(identity.body.updateModel).toBe('manual-versioned-replacement')
      expect(identity.csp).toContain("script-src 'self'")
      expect(identity.csp).not.toContain('unsafe-eval')

      const displayPromise = app.waitForEvent('window')
      await host.getByRole('button', { name: /open display in new window/i }).click()
      const display = await displayPromise
      await expect(display.getByTestId('display-route')).toBeVisible()
      await expect(display.getByText(/private teacher controls/i)).toHaveCount(0)
      const displayProbe = await display.evaluate(isolationProbe)
      expect(displayProbe.origin).toBe('cqs://app')
      expect(displayProbe.href).toContain('#/display')
      expect(displayProbe.requireDefined).toBe(false)
      expect(displayProbe.processDefined).toBe(false)
      expect(displayProbe.electronExposed).toBe(false)

      expect(await app.windows()).toHaveLength(2)
      await display.close()
      await expect.poll(async () => (await app.windows()).length).toBe(1)
      await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible()

      const reopen = app.waitForEvent('window')
      await host.getByRole('button', { name: /open display in new window/i }).click()
      const display2 = await reopen
      await expect(display2.getByTestId('display-route')).toBeVisible()

      const denied = await host.evaluate(() => window.open('https://example.com/', '_blank', 'noopener'))
      expect(denied).toBeNull()
    } finally {
      await app.close()
    }
  })

  test('IndexedDB and CQS persistence survive quit/relaunch with stable userData identity', async () => {
    const userData = mkdtempSync(join(tmpdir(), 'cqs-s03-persist-'))
    const first = await launchDesktop(userData)
    try {
      const host = await hostWindow(first)
      await host.evaluate(async () => {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('cqs-s03-probe', 1)
          req.onupgradeneeded = () => {
            req.result.createObjectStore('markers')
          }
          req.onsuccess = () => {
            const db = req.result
            const tx = db.transaction('markers', 'readwrite')
            tx.objectStore('markers').put({ marker: 'durable-1' }, 'k')
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => reject(tx.error)
          }
          req.onerror = () => reject(req.error)
        })
      })

      await expect(host.getByTestId('persistence-status')).toBeVisible()
      const initialize = host.getByRole('button', { name: /initialize \/ reset session/i })
      if (await initialize.isVisible()) {
        await initialize.click()
      }
      await host.getByRole('button', { name: /load category-board sample file/i }).click()
      await host.getByTestId('import-run').click()
      await expect(host.getByTestId('import-result')).toContainText(/import succeeded/i)
      await expect(host.getByTestId('game-title')).toHaveText('Earth & Space Science Board')
    } finally {
      await first.close()
    }

    const second = await launchDesktop(userData)
    try {
      const host = await hostWindow(second)
      const probe = await host.evaluate(async () => {
        return new Promise<unknown>((resolve, reject) => {
          const req = indexedDB.open('cqs-s03-probe', 1)
          req.onsuccess = () => {
            const db = req.result
            const tx = db.transaction('markers', 'readonly')
            const get = tx.objectStore('markers').get('k')
            get.onsuccess = () => {
              const value = get.result
              db.close()
              resolve(value)
            }
            get.onerror = () => reject(get.error)
          }
          req.onerror = () => reject(req.error)
        })
      })
      expect(probe).toEqual({ marker: 'durable-1' })

      const cqsDb = await host.evaluate(async () => {
        return new Promise<string>((resolve, reject) => {
          const req = indexedDB.open('classroom-quiz-show-persistence', 4)
          req.onsuccess = () => {
            const version = req.result.version
            req.result.close()
            resolve(`opened:${version}`)
          }
          req.onerror = () => reject(req.error)
        })
      })
      expect(cqsDb).toBe('opened:4')
      await expect(host.getByTestId('persistence-recovery')).toBeVisible()
      await expect(host.getByTestId('persistence-recovery')).toContainText(/unfinished session found/i)
      await host.getByTestId('persistence-resume').click()
      await expect(host.getByTestId('game-title')).toHaveText('Earth & Space Science Board')
    } finally {
      await second.close()
    }
  })

  test('keyboard, Gamepad API, WebHID API, Web Audio, and offline custom-protocol load work', async () => {
    const userData = mkdtempSync(join(tmpdir(), 'cqs-s03-apis-'))
    const app = await launchDesktop(userData)
    try {
      const host = await hostWindow(app)

      await host.evaluate(() => {
        const w = window as unknown as { __cqsKeys?: Array<{ code: string; key: string }> }
        w.__cqsKeys = []
        window.addEventListener('keydown', (event) => {
          w.__cqsKeys?.push({ code: event.code, key: event.key })
        })
      })
      await host.keyboard.press('Space')
      await expect
        .poll(async () =>
          host.evaluate(() => {
            const w = window as unknown as { __cqsKeys?: Array<{ code: string; key: string }> }
            return w.__cqsKeys ?? []
          }),
        )
        .toContainEqual({ code: 'Space', key: ' ' })

      const apis = await host.evaluate(() => {
        const hid = (navigator as Navigator & {
          hid?: { requestDevice?: unknown; getDevices?: unknown }
        }).hid
        return {
          gamepad: typeof navigator.getGamepads,
          gamepadLength: navigator.getGamepads().length,
          hid: typeof hid,
          hidRequest: typeof hid?.requestDevice,
          hidGet: typeof hid?.getDevices,
          audio: typeof AudioContext,
        }
      })
      expect(apis.gamepad).toBe('function')
      expect(apis.gamepadLength).toBeGreaterThanOrEqual(0)
      expect(apis.hid).toBe('object')
      expect(apis.hidRequest).toBe('function')
      expect(apis.hidGet).toBe('function')
      expect(apis.audio).toBe('function')

      const wavName = readdirSync(join(repoRoot, 'out/renderer/assets')).find((name) =>
        name.endsWith('.wav'),
      )
      expect(wavName).toBeTruthy()
      const audio = await host.evaluate(async (name) => {
        const res = await fetch(`cqs://app/assets/${name}`)
        const bytes = await res.arrayBuffer()
        const ctx = new AudioContext()
        const decoded = await ctx.decodeAudioData(bytes.slice(0))
        await ctx.close()
        return {
          ok: res.ok,
          bytes: bytes.byteLength,
          channels: decoded.numberOfChannels,
          duration: decoded.duration,
        }
      }, wavName)
      expect(audio.ok).toBe(true)
      expect(audio.bytes).toBeGreaterThan(1000)
      expect(audio.channels).toBeGreaterThanOrEqual(1)
      expect(audio.duration).toBeGreaterThan(0)

      await app.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (!win) throw new Error('missing window for offline emulation')
        const dbg = win.webContents.debugger
        try {
          dbg.attach('1.3')
        } catch {
          /* already attached */
        }
        await dbg.sendCommand('Network.enable')
        await dbg.sendCommand('Network.emulateNetworkConditions', {
          offline: true,
          latency: 0,
          downloadThroughput: 0,
          uploadThroughput: 0,
          connectionType: 'none',
        })
      })
      await host.reload()
      await expect(host.getByRole('heading', { name: /host control/i })).toBeVisible({
        timeout: 30_000,
      })
      const offlineOrigin = await host.evaluate(() => window.location.origin)
      expect(offlineOrigin).toBe('cqs://app')
    } finally {
      await app.close()
    }
  })
})
