import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('register-school-overwatch hook', () => {
  it('ships the Option B hook script with exact-SHA / pending / rollback guards', () => {
    const p = path.join(root, 'scripts/register-school-overwatch.mjs')
    assert.equal(fs.existsSync(p), true)
    const src = fs.readFileSync(p, 'utf8')
    assert.match(src, /github-pages/)
    assert.match(src, /release:register/)
    assert.match(src, /SOW_ROOT/)
    assert.match(src, /Does NOT enable Execution API/)
    assert.match(src, /deployment_pending/)
    assert.match(src, /--rollback/)
    assert.match(src, /never fall back to newest successful deploy/i)
  })

  it('ships lifecycle ticket emit + Mac consume helpers', () => {
    const emit = path.join(root, 'scripts/emit-overwatch-registration-ticket.mjs')
    const consume = path.join(root, 'scripts/consume-overwatch-registration-ticket.mjs')
    assert.equal(fs.existsSync(emit), true)
    assert.equal(fs.existsSync(consume), true)
    const emitSrc = fs.readFileSync(emit, 'utf8')
    const consumeSrc = fs.readFileSync(consume, 'utf8')
    assert.match(emitSrc, /school-overwatch-registration-ticket/)
    assert.match(emitSrc, /deployment_pending/)
    assert.match(emitSrc, /googleCredentialsInActions: false/)
    assert.match(consumeSrc, /EXIT_PENDING = 3/)
    assert.match(consumeSrc, /register-school-overwatch\.mjs/)
  })

  it('wires deploy-pages ticket emission without Google secrets', () => {
    const wf = fs.readFileSync(path.join(root, '.github/workflows/deploy-pages.yml'), 'utf8')
    assert.match(wf, /Emit Overwatch registration ticket/)
    assert.match(wf, /overwatch-registration-ticket/)
    assert.match(wf, /overwatch_ticket/)
    assert.match(wf, /needs: deploy/)
    assert.doesNotMatch(wf, /nchstx\.org/)
    assert.doesNotMatch(wf, /GOOGLE_APPLICATION_CREDENTIALS|CLASP_|GAS_/)
    assert.doesNotMatch(wf, /^\s*-\s+.*\bclasp\b/m)
  })
})
