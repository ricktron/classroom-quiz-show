#!/usr/bin/env node
/**
 * Mac-side consumer for Overwatch registration lifecycle tickets.
 *
 * Uses existing school Mac identity via sibling school-overwatch clasp.
 * Does NOT put Google credentials in GitHub Actions.
 *
 * Sources (first match):
 *   1. --ticket <path>
 *   2. artifacts/overwatch-registration-ticket.json
 *   3. Latest successful deploy-pages workflow artifact (gh)
 *
 * On deployment_pending: exit 3 (controlled retry — no uncontrolled polling).
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CQS_ROOT = path.resolve(__dirname, '..')
const EXIT_PENDING = 3

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

function parseArgs(argv) {
  const out = {
    ticket: null,
    push: false,
    deploy: false,
    dryRun: false,
    downloadOnly: false,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--ticket') out.ticket = path.resolve(argv[++i])
    else if (a === '--push') out.push = true
    else if (a === '--deploy') out.deploy = true
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--download-only') out.downloadOnly = true
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/consume-overwatch-registration-ticket.mjs
  [--ticket path.json] [--push] [--deploy] [--dry-run] [--download-only]
Exit 3 = deployment_pending (retry after Pages completes via approved workflow).`)
      process.exit(0)
    } else {
      console.error(`Unknown arg: ${a}`)
      process.exit(2)
    }
  }
  return out
}

function tryLocalTicket(explicit) {
  const candidates = [
    explicit,
    path.join(CQS_ROOT, 'artifacts/overwatch-registration-ticket.json'),
  ].filter(Boolean)
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function downloadLatestTicketArtifact() {
  const list = run('gh', [
    'run',
    'list',
    '-R',
    'ricktron/classroom-quiz-show',
    '--workflow',
    'deploy-pages.yml',
    '--limit',
    '8',
    '--json',
    'databaseId,headSha,conclusion,status',
  ])
  if (list.status !== 0) {
    throw new Error(`gh run list failed: ${(list.stderr || list.stdout).slice(0, 300)}`)
  }
  const runs = JSON.parse(list.stdout)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cqs-ow-ticket-'))
  for (const r of runs) {
    if (r.conclusion !== 'success' || r.status !== 'completed') continue
    const dl = run('gh', [
      'run',
      'download',
      String(r.databaseId),
      '-R',
      'ricktron/classroom-quiz-show',
      '-n',
      'overwatch-registration-ticket',
      '-D',
      tmp,
    ])
    if (dl.status !== 0) continue
    const found = path.join(tmp, 'overwatch-registration-ticket.json')
    if (fs.existsSync(found)) {
      const dest = path.join(CQS_ROOT, 'artifacts/overwatch-registration-ticket.json')
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(found, dest)
      return { path: dest, workflowRunId: r.databaseId, headSha: r.headSha }
    }
  }
  return null
}

function main() {
  const args = parseArgs(process.argv)
  let ticketPath = tryLocalTicket(args.ticket)
  let downloadMeta = null
  if (!ticketPath) {
    downloadMeta = downloadLatestTicketArtifact()
    ticketPath = downloadMeta && downloadMeta.path
  }
  if (!ticketPath) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'ticket_not_found',
          hint: 'Emit via deploy-pages ticket step, or run emit-overwatch-registration-ticket.mjs locally for an approved SHA.',
          remainingTrigger:
            'School Mac must obtain a ticket (local emit or gh artifact) then consume — Actions never holds Google/clasp secrets.',
        },
        null,
        2,
      ),
    )
    process.exit(1)
  }

  const ticket = JSON.parse(fs.readFileSync(ticketPath, 'utf8'))
  if (ticket.kind !== 'school-overwatch-registration-ticket') {
    console.error(JSON.stringify({ ok: false, error: 'invalid_ticket_kind' }, null, 2))
    process.exit(1)
  }

  if (ticket.deployProof?.status === 'deployment_pending') {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: 'deployment_pending',
          sourceCommit: ticket.sourceCommit,
          hint: 'Retry consume after the approved Pages deploy for this SHA succeeds (no uncontrolled polling).',
          ticketPath,
        },
        null,
        2,
      ),
    )
    process.exit(EXIT_PENDING)
  }

  if (ticket.deployProof?.status !== 'success' || !ticket.deployProof.deploymentId) {
    console.error(
      JSON.stringify(
        { ok: false, error: 'ticket_deploy_proof_incomplete', deployProof: ticket.deployProof },
        null,
        2,
      ),
    )
    process.exit(1)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'ticket_accepted',
        ticketPath,
        sourceCommit: ticket.sourceCommit,
        deploymentId: ticket.deployProof.deploymentId,
        releaseAuthorization: ticket.releaseAuthorization,
        downloadMeta,
      },
      null,
      2,
    ),
  )

  if (args.downloadOnly) process.exit(0)

  const regArgs = [
    'scripts/register-school-overwatch.mjs',
    '--sha',
    ticket.sourceCommit,
    '--deployment-id',
    String(ticket.deployProof.deploymentId),
  ]
  if (args.dryRun) regArgs.push('--dry-run')
  if (args.push) regArgs.push('--push')
  if (args.deploy) regArgs.push('--deploy')

  const reg = run(process.execPath, regArgs)
  process.stdout.write(reg.stdout)
  process.stderr.write(reg.stderr)
  if (reg.status === EXIT_PENDING) process.exit(EXIT_PENDING)
  process.exit(reg.status || 0)
}

main()
