#!/usr/bin/env node
/**
 * Classroom Quiz Show → School Overwatch Option B registration hook.
 *
 * Bound to this repo's GitHub Pages deployment evidence (gh API).
 * Does NOT invent releaseDecisionId. Does NOT enable Execution API.
 *
 * Requires a sibling (or SOW_ROOT) checkout of ricktron/school-overwatch with
 * school clasp login. Invokes Overwatch `npm run release:register`.
 *
 * Usage (from CQS repo root, after Pages deploy succeeds):
 *   node scripts/register-school-overwatch.mjs
 *   node scripts/register-school-overwatch.mjs --push --deploy
 *   node scripts/register-school-overwatch.mjs --dry-run
 *
 * This is the cross-project release hook. Distinguishes from manually editing
 * Overwatch descriptors: evidence comes from THIS repo's Pages deployment.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CQS_ROOT = path.resolve(__dirname, '..')

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    cwd: opts.cwd ?? CQS_ROOT,
    env: process.env,
  })
  return {
    status: res.status == null ? 1 : res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  }
}

function resolveSowRoot() {
  if (process.env.SOW_ROOT) return path.resolve(process.env.SOW_ROOT)
  const candidates = [
    path.resolve(CQS_ROOT, '../school-overwatch'),
    path.resolve('/Volumes/OpenClaw-Data/repos/school-overwatch'),
    path.resolve(
      process.env.HOME || '',
      'Documents/Coding/Cursor Projects/school-overwatch',
    ),
  ]
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json')) && fs.existsSync(path.join(c, 'scripts/sow-release-register.js'))) {
      return c
    }
  }
  return null
}

function ghJson(apiPath) {
  const res = run('gh', ['api', apiPath])
  if (res.status !== 0) {
    throw new Error(`gh api failed: ${(res.stderr || res.stdout).slice(0, 400)}`)
  }
  return JSON.parse(res.stdout)
}

function parseArgs(argv) {
  const out = { dryRun: false, push: false, deploy: false }
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--push') out.push = true
    else if (a === '--deploy') out.deploy = true
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/register-school-overwatch.mjs [--dry-run] [--push] [--deploy]
Env: SOW_ROOT=/path/to/school-overwatch`)
      process.exit(0)
    } else {
      console.error(`Unknown arg: ${a}`)
      process.exit(2)
    }
  }
  return out
}

function main() {
  const args = parseArgs(process.argv)
  const pkg = JSON.parse(fs.readFileSync(path.join(CQS_ROOT, 'package.json'), 'utf8'))
  const remote = run('git', ['remote', 'get-url', 'origin'])
  if (!/classroom-quiz-show/.test(remote.stdout + remote.stderr)) {
    console.error(JSON.stringify({ ok: false, error: 'wrong_cqs_repo' }, null, 2))
    process.exit(1)
  }
  const head = run('git', ['rev-parse', 'HEAD'])
  if (head.status !== 0) {
    console.error(JSON.stringify({ ok: false, error: 'git_head_failed' }, null, 2))
    process.exit(1)
  }
  const sha = head.stdout.trim()

  const pages = ghJson('repos/ricktron/classroom-quiz-show/pages')
  if (pages.status !== 'built') {
    console.error(JSON.stringify({ ok: false, error: 'pages_not_built', status: pages.status }, null, 2))
    process.exit(1)
  }
  const htmlUrl = String(pages.html_url || '').replace(/\/$/, '')
  const expected = 'https://ricktron.github.io/classroom-quiz-show'
  if (htmlUrl !== expected) {
    console.error(JSON.stringify({ ok: false, error: 'pages_url_mismatch', htmlUrl }, null, 2))
    process.exit(1)
  }

  const deps = ghJson('repos/ricktron/classroom-quiz-show/deployments?environment=github-pages&per_page=5')
  let chosen = null
  let status = null
  for (const d of deps) {
    const st = ghJson(`repos/ricktron/classroom-quiz-show/deployments/${d.id}/statuses`)
    if (!Array.isArray(st) || !st.length || st[0].state !== 'success') continue
    // Prefer deploy matching current HEAD; else newest success
    if (d.sha === sha) {
      chosen = d
      status = st[0]
      break
    }
    if (!chosen) {
      chosen = d
      status = st[0]
    }
  }
  if (!chosen) {
    console.error(JSON.stringify({ ok: false, error: 'no_successful_pages_deployment' }, null, 2))
    process.exit(1)
  }

  const sowRoot = resolveSowRoot()
  if (!sowRoot) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'school_overwatch_checkout_not_found',
          hint: 'Set SOW_ROOT or clone ricktron/school-overwatch next to this repo.',
          readyToApply: true,
          next: 'With SOW_ROOT set, re-run this hook after Pages deploy.',
        },
        null,
        2,
      ),
    )
    process.exit(1)
  }

  // registrationVersion: bump via Overwatch adopt; seed from existing if present
  let registrationVersion = 1
  const regPath = path.join(sowRoot, 'config/registered-apps.json')
  if (fs.existsSync(regPath)) {
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'))
    const prev = (reg.apps || []).find((a) => a.id === 'classroom-quiz-show')
    if (prev && Number(prev.registrationVersion) >= 1) {
      // If SHA changed vs prior attestation, bump; else same version for noop path
      const priorSha =
        prev.deployProvenance && (prev.deployProvenance.deploymentSha || prev.deployProvenance.gitCommit)
      if (priorSha && priorSha === chosen.sha) {
        registrationVersion = Number(prev.registrationVersion)
      } else {
        registrationVersion = Number(prev.registrationVersion) + 1
      }
    }
  }

  const descriptor = {
    id: 'classroom-quiz-show',
    title: 'Classroom Quiz Show',
    url: `${expected}/`,
    tier: 'established',
    lifecycle: 'active',
    registrationVersion,
    promotionAuthority: 'owner-release',
    owningApp: 'Classroom Quiz Show',
    owningRepo: 'ricktron/classroom-quiz-show',
    deployProvenance: {
      productVersion: pkg.version,
      deployVerified: true,
      verificationMethod: 'github-pages-deployment',
      deploymentSha: chosen.sha,
      gitCommit: chosen.sha,
    },
    category: 'discover',
    group: 'Classroom',
    tags: ['quiz', 'pages', 'classroom'],
    privacy: 'aggregates_ok',
    notes: `CQS release hook; Pages deployment ${chosen.id}; status ${status.state}`,
  }

  const descDir = path.join(sowRoot, 'config/descriptors')
  fs.mkdirSync(descDir, { recursive: true })
  const descFile = path.join(descDir, `classroom-quiz-show.from-cqs-hook.json`)
  fs.writeFileSync(descFile, `${JSON.stringify(descriptor, null, 2)}\n`)

  const sowArgs = [
    'run',
    'release:register',
    '--',
    '--descriptor',
    path.relative(sowRoot, descFile),
    '--expected-sha',
    chosen.sha,
  ]
  if (args.dryRun) sowArgs.push('--dry-run')
  if (args.push) sowArgs.push('--push')
  if (args.deploy) sowArgs.push('--deploy')

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'cqs_hook_prepared',
        hook: 'classroom-quiz-show/scripts/register-school-overwatch.mjs',
        pagesDeploymentId: chosen.id,
        pagesSha: chosen.sha,
        cqsHead: sha,
        shaMatchHead: chosen.sha === sha,
        sowRoot,
        descriptorPath: descFile,
        registrationVersion,
        invoking: `npm ${sowArgs.join(' ')}`,
      },
      null,
      2,
    ),
  )

  const sow = run('npm', sowArgs, { cwd: sowRoot })
  process.stdout.write(sow.stdout)
  process.stderr.write(sow.stderr)
  if (sow.status !== 0) process.exit(sow.status || 1)
}

main()
