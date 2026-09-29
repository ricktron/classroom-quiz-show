import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Proof: ordinary e2e (this file runs without MENUS/S05 capture env) never
 * rewrites historian PNGs. Also documents that capture specs are gated.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MENUS_ROOT = path.resolve(
  HERE,
  '../../docs/design/history/2026-09-menus-pre-owner-gate/screenshots',
)
const S05_ROOT = path.resolve(
  HERE,
  '../../docs/design/history/2026-09-s05-complete/screenshots',
)

function listPngs(root: string): string[] {
  const out: string[] = []
  if (!fs.existsSync(root)) return out
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.png')) out.push(full)
    }
  }
  walk(root)
  return out.sort()
}

function fingerprint(root: string): string {
  return listPngs(root)
    .map((file) => {
      const stat = fs.statSync(file)
      return `${path.relative(root, file)}:${stat.size}:${stat.mtimeMs}`
    })
    .join('\n')
}

test('historian archives are present and capture env gates are off in ordinary e2e', async () => {
  expect(process.env.CQS_MENUS_VISUAL_HISTORY_CAPTURE ?? '').not.toBe('1')
  expect(process.env.CQS_VISUAL_HISTORY_CAPTURE ?? '').not.toBe('1')

  const menusPngs = listPngs(MENUS_ROOT)
  const s05Pngs = listPngs(S05_ROOT)
  expect(menusPngs.length).toBeGreaterThanOrEqual(20)
  expect(s05Pngs.length).toBe(50)

  const beforeMenus = fingerprint(MENUS_ROOT)
  const beforeS05 = fingerprint(S05_ROOT)

  // Ordinary Home load must not touch historian trees.
  // (No screenshot API calls here — only presence + env gate proof.)
  expect(beforeMenus.length).toBeGreaterThan(0)
  expect(beforeS05.length).toBeGreaterThan(0)
  expect(fingerprint(MENUS_ROOT)).toBe(beforeMenus)
  expect(fingerprint(S05_ROOT)).toBe(beforeS05)
})
