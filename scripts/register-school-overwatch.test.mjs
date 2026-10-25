import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('register-school-overwatch hook', () => {
  it('ships the Option B hook script', () => {
    const p = path.join(root, 'scripts/register-school-overwatch.mjs')
    assert.equal(fs.existsSync(p), true)
    const src = fs.readFileSync(p, 'utf8')
    assert.match(src, /github-pages/)
    assert.match(src, /release:register/)
    assert.match(src, /SOW_ROOT/)
    assert.match(src, /Does NOT enable Execution API/)
  })
})
