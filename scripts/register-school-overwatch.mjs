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
 * Usage (from CQS repo root, after Pages deploy succeeds for the authorized SHA):
 *   node scripts/register-school-overwatch.mjs
 *   node scripts/register-school-overwatch.mjs --sha <authorized-source-sha>
 *   node scripts/register-school-overwatch.mjs --sha <prior> --rollback
 *   node scripts/register-school-overwatch.mjs --push --deploy
 *   node scripts/register-school-overwatch.mjs --dry-run
 *
 * Prefer lifecycle path after deploy-pages emits a ticket:
 *   npm run register:overwatch:from-ticket -- --push --deploy
 *
 * Classification note: command-exists / manual-after-deploy ≠ automatic workflow.
 * Ticket emission is part of deploy-pages; Mac consume is the remaining trigger
 * unless a school-Mac runner/LaunchAgent is owner-installed.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CQS_ROOT = path.resolve(__dirname, '..')
const EXPECTED_URL = 'https://ricktron.github.io/classroom-quiz-show'
const EXIT_PENDING = 3
const ESTABLISHED_UPDATE_POLICY =
  'established-update-standing: verified GitHub Pages deploy for owningRepo may update Overwatch registration under promotionAuthority=owner-release (school-overwatch docs/REGISTRATION.md). No invented owner decision IDs.'

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
    if (
      fs.existsSync(path.join(c, 'package.json')) &&
      fs.existsSync(path.join(c, 'scripts/sow-release-register.js'))
    ) {
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
  const out = {
    dryRun: false,
    push: false,
    deploy: false,
    rollback: false,
    sha: null,
    deploymentId: null,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--push') out.push = true
    else if (a === '--deploy') out.deploy = true
    else if (a === '--rollback') out.rollback = true
    else if (a === '--sha') out.sha = argv[++i]
    else if (a === '--deployment-id') out.deploymentId = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/register-school-overwatch.mjs
  [--sha <authorized-source-sha>] [--deployment-id <id>] [--rollback]
  [--dry-run] [--push] [--deploy]
Env: SOW_ROOT=/path/to/school-overwatch
Exit 3 = deployment_pending (Pages SHA for authorized commit not success yet).`)
      process.exit(0)
    } else {
      console.error(`Unknown arg: ${a}`)
      process.exit(2)
    }
  }
  return out
}

function selectPagesDeployment({ authorizedSha, deploymentId, allowRollback }) {
  const deps = ghJson(
    'repos/ricktron/classroom-quiz-show/deployments?environment=github-pages&per_page=20',
  )
  if (deploymentId) {
    const d = deps.find((x) => String(x.id) === String(deploymentId))
    if (!d) {
      return { ok: false, error: 'deployment_id_not_found', deploymentId }
    }
    if (authorizedSha && d.sha !== authorizedSha) {
      return {
        ok: false,
        error: 'deployment_id_sha_mismatch',
        deploymentId,
        deploymentSha: d.sha,
        authorizedSha,
      }
    }
    const st = ghJson(
      `repos/ricktron/classroom-quiz-show/deployments/${d.id}/statuses`,
    )
    if (!Array.isArray(st) || !st.length || st[0].state !== 'success') {
      return {
        ok: false,
        error: 'deployment_pending',
        deploymentId: d.id,
        authorizedSha: d.sha,
        state: st && st[0] && st[0].state,
      }
    }
    return { ok: true, chosen: d, status: st[0] }
  }

  // Exact SHA match only — never fall back to newest successful deploy.
  for (const d of deps) {
    if (d.sha !== authorizedSha) continue
    const st = ghJson(
      `repos/ricktron/classroom-quiz-show/deployments/${d.id}/statuses`,
    )
    if (!Array.isArray(st) || !st.length) continue
    if (st[0].state !== 'success') {
      return {
        ok: false,
        error: 'deployment_pending',
        deploymentId: d.id,
        authorizedSha,
        state: st[0].state,
      }
    }
    return { ok: true, chosen: d, status: st[0], rollback: !!allowRollback }
  }

  return {
    ok: false,
    error: 'deployment_pending',
    authorizedSha,
    hint: 'No successful github-pages deployment for this SHA yet. Retry after approved Pages workflow completes — do not select a different SHA.',
  }
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
  const headSha = head.stdout.trim()
  const authorizedSha = args.sha || headSha

  if (args.rollback && !args.sha && !args.deploymentId) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'rollback_requires_explicit_sha_or_deployment_id',
          hint: 'Pass --sha <prior-success-sha> and/or --deployment-id <id> with --rollback.',
        },
        null,
        2,
      ),
    )
    process.exit(2)
  }

  // Current-HEAD release: omit --sha or pass HEAD. Intentional rollback: --rollback.
  // Lifecycle ticket may bind --sha + --deployment-id for an approved main deploy
  // while this checkout is on a different feature branch — that is authorized.
  if (
    !args.rollback &&
    args.sha &&
    args.sha !== headSha &&
    !args.deploymentId
  ) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'sha_not_current_head_without_rollback',
          headSha,
          authorizedSha: args.sha,
          hint: 'For current-HEAD release, omit --sha or pass HEAD. For intentional rollback, add --rollback. For lifecycle tickets, pass --deployment-id with --sha.',
        },
        null,
        2,
      ),
    )
    process.exit(2)
  }

  const pages = ghJson('repos/ricktron/classroom-quiz-show/pages')
  if (pages.status !== 'built') {
    console.error(
      JSON.stringify(
        { ok: false, error: 'pages_not_built', status: pages.status },
        null,
        2,
      ),
    )
    process.exit(1)
  }
  const htmlUrl = String(pages.html_url || '').replace(/\/$/, '')
  if (htmlUrl !== EXPECTED_URL) {
    console.error(JSON.stringify({ ok: false, error: 'pages_url_mismatch', htmlUrl }, null, 2))
    process.exit(1)
  }

  const selected = selectPagesDeployment({
    authorizedSha,
    deploymentId: args.deploymentId,
    allowRollback: args.rollback,
  })
  if (!selected.ok) {
    const code = selected.error === 'deployment_pending' ? EXIT_PENDING : 1
    console.error(JSON.stringify({ ok: false, ...selected }, null, 2))
    process.exit(code)
  }
  const { chosen, status } = selected

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

  let registrationVersion = 1
  const regPath = path.join(sowRoot, 'config/registered-apps.json')
  if (fs.existsSync(regPath)) {
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'))
    const prev = (reg.apps || []).find((a) => a.id === 'classroom-quiz-show')
    if (prev && Number(prev.registrationVersion) >= 1) {
      const priorSha =
        prev.deployProvenance &&
        (prev.deployProvenance.deploymentSha || prev.deployProvenance.gitCommit)
      if (priorSha && priorSha === chosen.sha) {
        registrationVersion = Number(prev.registrationVersion)
      } else {
        registrationVersion = Number(prev.registrationVersion) + 1
      }
    }
  }

  const evidencePlanes = {
    deployProof: {
      status: status.state,
      pagesStatus: pages.status,
      htmlUrl,
      deploymentId: chosen.id,
      deploymentSha: chosen.sha,
      deploymentRef: chosen.ref,
      deploymentCreatedAt: chosen.created_at,
    },
    sourceCommit: authorizedSha,
    releaseAuthorization: {
      policy: ESTABLISHED_UPDATE_POLICY,
      promotionAuthority: 'owner-release',
      rollback: !!args.rollback,
      inventedOwnerDecisionId: false,
    },
    registration: {
      version: registrationVersion,
      tier: 'established',
    },
  }

  const descriptor = {
    id: 'classroom-quiz-show',
    title: 'Classroom Quiz Show',
    url: `${EXPECTED_URL}/`,
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
      deployId: String(chosen.id),
    },
    category: 'discover',
    group: 'Classroom',
    tags: ['quiz', 'pages', 'classroom'],
    privacy: 'aggregates_ok',
    notes: `CQS release hook; Pages deployment ${chosen.id}; status ${status.state}${
      args.rollback ? '; rollback registration' : ''
    }`,
  }

  const descDir = path.join(sowRoot, 'config/descriptors')
  fs.mkdirSync(descDir, { recursive: true })
  const descFile = path.join(descDir, `classroom-quiz-show.from-cqs-hook.json`)
  fs.writeFileSync(descFile, `${JSON.stringify(descriptor, null, 2)}\n`)

  const evidenceDir = path.join(CQS_ROOT, 'artifacts/overwatch-registration')
  fs.mkdirSync(evidenceDir, { recursive: true })
  const evidenceFile = path.join(evidenceDir, `evidence-${Date.now()}.json`)
  fs.writeFileSync(
    evidenceFile,
    `${JSON.stringify({ schemaVersion: 1, ...evidencePlanes }, null, 2)}\n`,
  )

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
        automationClass: 'manual-after-deploy-or-mac-ticket-consume',
        pagesDeploymentId: chosen.id,
        pagesSha: chosen.sha,
        cqsHead: headSha,
        authorizedSha,
        shaMatchAuthorized: chosen.sha === authorizedSha,
        rollback: !!args.rollback,
        sowRoot,
        descriptorPath: descFile,
        evidencePath: evidenceFile,
        evidencePlanes,
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
