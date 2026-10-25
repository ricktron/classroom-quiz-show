#!/usr/bin/env node
/**
 * Emit a School Overwatch registration lifecycle ticket after a successful
 * GitHub Pages deploy. Runs in Actions (no Google credentials) or locally.
 *
 * Ticket = deploy proof only. It does not invent release approval and does
 * not call clasp / Overwatch. Mac school identity consumes the ticket.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CQS_ROOT = path.resolve(__dirname, '..')
const REPO = 'ricktron/classroom-quiz-show'
const EXPECTED_URL = 'https://ricktron.github.io/classroom-quiz-show'
const POLICY =
  'established-update-standing: verified GitHub Pages deploy for owningRepo may update Overwatch registration under promotionAuthority=owner-release (docs/REGISTRATION.md in school-overwatch). No invented owner decision IDs.'

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

function ghJson(apiPath) {
  const res = run('gh', ['api', apiPath])
  if (res.status !== 0) {
    throw new Error(`gh api failed: ${(res.stderr || res.stdout).slice(0, 400)}`)
  }
  return JSON.parse(res.stdout)
}

function parseArgs(argv) {
  const out = {
    sha: null,
    out: path.join(CQS_ROOT, 'artifacts/overwatch-registration-ticket.json'),
    pagesUrl: null,
    workflowRunId: process.env.GITHUB_RUN_ID || null,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--sha') out.sha = argv[++i]
    else if (a === '--out') out.out = path.resolve(argv[++i])
    else if (a === '--pages-url') out.pagesUrl = argv[++i]
    else if (a === '--workflow-run-id') out.workflowRunId = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/emit-overwatch-registration-ticket.mjs [--sha <sha>] [--out path] [--pages-url url] [--workflow-run-id id]',
      )
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
  let sha = args.sha
  if (!sha) {
    const head = run('git', ['rev-parse', 'HEAD'])
    if (head.status !== 0) {
      console.error(JSON.stringify({ ok: false, error: 'git_head_failed' }, null, 2))
      process.exit(1)
    }
    sha = head.stdout.trim()
  }

  const pages = ghJson(`repos/${REPO}/pages`)
  const htmlUrl = String(pages.html_url || '').replace(/\/$/, '')
  if (htmlUrl !== EXPECTED_URL) {
    console.error(JSON.stringify({ ok: false, error: 'pages_url_mismatch', htmlUrl }, null, 2))
    process.exit(1)
  }

  // deploy-pages can finish before the deployment status is queryable.
  // Bounded retry only (not uncontrolled polling): ~12 × 5s.
  // GitHub may mark deploy-pages complete ~60–90s before deployment status=success.
  const maxAttempts = Number(process.env.OW_TICKET_RETRY_ATTEMPTS || 24)
  const delayMs = Number(process.env.OW_TICKET_RETRY_MS || 5000)
  let chosen = null
  let status = null
  let attempts = 0
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt
    const deps = ghJson(`repos/${REPO}/deployments?environment=github-pages&per_page=15`)
    for (const d of deps) {
      if (d.sha !== sha) continue
      const st = ghJson(`repos/${REPO}/deployments/${d.id}/statuses`)
      if (!Array.isArray(st) || !st.length) continue
      const top = st[0]
      if (top.state !== 'success') {
        status = top
        continue
      }
      chosen = d
      status = top
      break
    }
    if (chosen) break
    if (attempt < maxAttempts) {
      spawnSync('sleep', [String(Math.ceil(delayMs / 1000))], { stdio: 'ignore' })
    }
  }

  const ticket = {
    schemaVersion: 1,
    kind: 'school-overwatch-registration-ticket',
    sourceRepo: REPO,
    appId: 'classroom-quiz-show',
    emittedAt: new Date().toISOString(),
    workflowRunId: args.workflowRunId,
    // Distinct evidence planes (deploy proof ≠ release approval)
    deployProof: chosen
      ? {
          status: 'success',
          pagesStatus: pages.status,
          htmlUrl,
          pageUrl: args.pagesUrl || htmlUrl,
          deploymentId: chosen.id,
          deploymentSha: chosen.sha,
          deploymentRef: chosen.ref,
          deploymentCreatedAt: chosen.created_at,
          deploymentState: status.state,
        }
      : {
          status: 'deployment_pending',
          pagesStatus: pages.status,
          htmlUrl,
          pageUrl: args.pagesUrl || htmlUrl,
          deploymentId: null,
          deploymentSha: null,
          expectedSha: sha,
          note: 'No successful github-pages deployment yet for authorized source SHA.',
          lookupAttempts: attempts,
        },
    sourceCommit: sha,
    lookupAttempts: attempts,
    releaseAuthorization: {
      policy: POLICY,
      promotionAuthority: 'owner-release',
      tier: 'established',
      inventedOwnerDecisionId: false,
    },
    consumer: {
      next: 'mac-school-identity',
      command: 'npm run register:overwatch:from-ticket',
      googleCredentialsInActions: false,
      executionApi: false,
    },
  }

  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.writeFileSync(args.out, `${JSON.stringify(ticket, null, 2)}\n`)

  const payload = {
    ok: ticket.deployProof.status === 'success',
    pending: ticket.deployProof.status === 'deployment_pending',
    error:
      ticket.deployProof.status === 'deployment_pending' ? 'deployment_pending' : undefined,
    ticketPath: args.out,
    sourceCommit: sha,
    deploymentId: ticket.deployProof.deploymentId || null,
  }
  console.log(JSON.stringify(payload, null, 2))
  // Exit 0 even when pending so Actions can upload the pending ticket for Mac retry.
  process.exit(0)
}

main()
