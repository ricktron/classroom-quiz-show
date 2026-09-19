import { expect, test } from '@playwright/test'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Real IndexedDB restore atomicity.
 *
 * Memory-adapter unit tests discard an in-memory snapshot when work throws.
 * They do not open IndexedDB and are not evidence for this spec.
 * This spec bundles the production adapter and applyStagedBackup into Chromium
 * and does not mock `put`.
 */
test.describe('S04C-H3 IndexedDB restore atomicity', () => {
  test('stale-before-commit writes nothing and a finished commit stays durable', async ({
    page,
  }) => {
    const dir = await mkdtemp(join(tmpdir(), 'cqs-idb-atomicity-'))
    const outfile = join(dir, 'harness.js')
    const harnessPath = join(
      dirname(fileURLToPath(import.meta.url)),
      'backup-idb-atomicity.harness.ts',
    )
    await build({
      entryPoints: [harnessPath],
      bundle: true,
      format: 'iife',
      globalName: 'CqsIdbAtomicity',
      outfile,
      platform: 'browser',
      target: 'es2022',
    })

    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    try {
      await page.goto('./')
      await page.addScriptTag({ path: outfile })
      const report = await page.evaluate(() => {
        const probe = (
          globalThis as unknown as {
            CqsIdbAtomicity?: { runIdbAtomicityProbe?: () => Promise<unknown> }
          }
        ).CqsIdbAtomicity?.runIdbAtomicityProbe
        if (!probe) throw new Error('IndexedDB atomicity harness was not installed')
        return probe()
      })

      expect(pageErrors).toEqual([])
      expect(report).toEqual({
        requestSuccessIsNotCommit: {
          putPromiseResolved: true,
          resultOk: false,
          resultCode: 'transaction-failed',
          keepMarker: 'keep-original',
          keepTitle: 'Original',
          partialMedia: null,
        },
        staleBeforeFirstWrite: unchangedLibrary({ calls: 3 }),
        staleAfterRequestsBeforeCommit: unchangedLibrary({ calls: 4 }),
        committedThenOwnershipLost: {
          ownershipAfterReturn: false,
          status: 'success',
          issueCode: null,
          issueMessage: null,
          keepTitle: 'Replaced',
          keepDraft: 'new-draft',
          otherTitle: 'Other',
          incomingTitle: 'Incoming',
          incomingDraft: 'incoming-draft',
          oldMediaMarker: null,
          newMediaSourcePath: 'new.png',
          newMediaByteLength: 3,
          stayMediaMarker: 'stay-scope-b',
          sessionMarker: 'session-untouched',
        },
        retryAfterStaleApplies: {
          firstStatus: 'failure',
          firstIssueCode: 'apply-aborted',
          incomingAfterAbort: null,
          secondStatus: 'success',
          incomingAfterRetry: 'Incoming',
          keepTitleAfterRetry: 'Replaced',
        },
        repeatedRestoreLastWriteWins: {
          firstStatus: 'success',
          secondStatus: 'success',
          keepTitle: 'Second title',
          keepDraft: 'second-draft',
        },
        cloneErrorRollsBackEarlierPut: {
          resultCode: 'transaction-failed',
          incomingTitle: null,
          keepTitle: 'Original',
        },
        throwAfterCommitIsNotDenied: {
          resultOk: true,
          resultCode: null,
          keepTitle: 'Committed',
          keepDraft: 'committed-draft',
          keepMarker: 'after-macrotask',
        },
        quotaTested: false,
      })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

function unchangedLibrary(extra: { calls: number }) {
  return {
    ...extra,
    status: 'failure',
    issueCode: 'apply-aborted',
    issueMessage:
      'Restore was cancelled because the page or session changed before it finished.',
    keepTitle: 'Original',
    keepDraft: 'old-draft',
    otherTitle: 'Other',
    incomingTitle: null,
    incomingDraft: null,
    oldMediaMarker: 'old-scope-a',
    newMediaSourcePath: null,
    newMediaByteLength: null,
    stayMediaMarker: 'stay-scope-b',
    sessionMarker: 'session-untouched',
  }
}
