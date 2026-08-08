import { useRef, useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import type { PrivateGameState } from '../state/privateState'
import type { RoundRegistry } from '../game/registry'
import type { PersistenceAdapter } from '../persistence/adapter'
import {
  MAX_PACK_INPUT_BYTES,
  PACK_EXTENSION,
  collectReferencedPackScopeKeys,
  commitPackAssets,
  createPackAssetStorage,
  gcUnreferencedPackScopes,
  getSharedPackResourceRegistry,
  hydratePackMediaForDefinition,
  importPackFromBytes,
  packIssue,
  type ImportPackResult,
  type PackIssue,
  type PackResourceRegistry,
} from '../pack'
import { browserDecodeImage } from '../pack/browserDecodeImage'
import { publishActivePackResourceScope } from '../pack/packMediaScopeSync'
import './GamePackImportPanel.css'

/**
 * Host-only portable-pack import surface (Slice 19).
 *
 * Validates `.cqs-pack` bytes, commits durable media on success, hydrates the
 * runtime registry, and loads through `INITIALIZE_GAME`. Failures leave the
 * active game unchanged.
 */

export interface GamePackImportPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly registry: RoundRegistry
  readonly hasSession: boolean
  readonly activeGame: PrivateGameState | null
  readonly adapter: PersistenceAdapter
  readonly packRegistry?: PackResourceRegistry
  /** Injectable file reader for tests. */
  readonly readFileBytes?: (file: File) => Promise<Uint8Array>
}

type LoadOutcome =
  | { readonly kind: 'none' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'not-loaded'; readonly reason: string }

interface Attempt {
  readonly result: ImportPackResult | CommitFailure
  readonly load: LoadOutcome
  readonly attemptNumber: number
}

type CommitFailure = {
  readonly status: 'failure'
  readonly issues: readonly PackIssue[]
}

export function GamePackImportPanel({
  dispatch,
  registry,
  hasSession,
  activeGame,
  adapter,
  packRegistry = getSharedPackResourceRegistry(),
  readFileBytes = defaultReadFileBytes,
}: GamePackImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [busy, setBusy] = useState(false)

  async function runImport(file: File): Promise<void> {
    const attemptNumber = attemptCount + 1
    setAttemptCount(attemptNumber)
    setBusy(true)

    try {
      if (!hasSession) {
        setAttempt({
          result: {
            status: 'failure',
            issues: [
              {
                code: 'pack-commit-failed',
                stage: 'commit',
                path: '',
                message: 'Initialize a session first, then import the pack again.',
              },
            ],
          },
          load: { kind: 'not-loaded', reason: 'Initialize a session first, then import again.' },
          attemptNumber,
        })
        return
      }

      if (file.size > MAX_PACK_INPUT_BYTES) {
        setAttempt({
          result: {
            status: 'failure',
            issues: [
              packIssue(
                'pack-input-too-large',
                'transport',
                '',
                `The pack file is ${file.size} bytes, which exceeds the ${MAX_PACK_INPUT_BYTES}-byte limit.`,
                { context: { length: file.size, limit: MAX_PACK_INPUT_BYTES } },
              ),
            ],
          },
          load: { kind: 'none' },
          attemptNumber,
        })
        return
      }

      const bytes = await readFileBytes(file)
      const imported = await importPackFromBytes(bytes, {
        registry,
        decodeImage: browserDecodeImage,
      })

      if (imported.status !== 'success') {
        setAttempt({ result: imported, load: { kind: 'none' }, attemptNumber })
        return
      }

      const committed = await commitPackAssets(createPackAssetStorage(adapter), {
        resourceScopeKey: imported.resourceScopeKey,
        gameId: imported.definition.id,
        gameSha256: imported.gameSha256,
        mediaAssets: imported.mediaAssets,
      })

      if (committed.status !== 'success') {
        setAttempt({ result: committed, load: { kind: 'none' }, attemptNumber })
        return
      }

      const assets = new Map(
        imported.mediaAssets.map((asset) => [
          asset.sourcePath,
          {
            bytes: asset.bytes,
            mediaType: asset.mediaType,
            sha256: asset.sha256,
          },
        ]),
      )
      packRegistry.setActiveScope(imported.resourceScopeKey, assets)
      await publishActivePackResourceScope(adapter, imported.resourceScopeKey)

      const dispatched = dispatch({
        type: 'INITIALIZE_GAME',
        issuedAt: Date.now(),
        definition: imported.definition,
      })

      if (dispatched.status !== 'accepted') {
        packRegistry.clear()
        await publishActivePackResourceScope(adapter, null)
        const keepScopeKeys = await collectReferencedPackScopeKeys(adapter, {
          activeDefinition: activeGame?.definition ?? null,
          roundRegistry: registry,
        })
        await gcUnreferencedPackScopes(adapter, { keepScopeKeys })
        if (activeGame?.definition) {
          await hydratePackMediaForDefinition(
            adapter,
            activeGame.definition,
            packRegistry,
            registry,
          )
        }
        setAttempt({
          result: imported,
          load: {
            kind: 'not-loaded',
            reason: `The session rejected the game (${dispatched.reason}).`,
          },
          attemptNumber,
        })
        return
      }

      setAttempt({
        result: imported,
        load: { kind: 'loaded' },
        attemptNumber,
      })
    } catch {
      setAttempt({
        result: {
          status: 'failure',
          issues: [
            {
              code: 'pack-malformed-container',
              stage: 'container',
              path: '',
              message: 'The pack file could not be read.',
            },
          ],
        },
        load: { kind: 'none' },
        attemptNumber,
      })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="pack-import" aria-labelledby="pack-import-title">
      <div className="foundation__tag foundation__tag--slice19">
        Portable pack import (Slice 19) — host-only, not gameplay
      </div>
      <h3 id="pack-import-title">Import portable pack file</h3>
      <p className="host__note">
        Choose a self-contained <code>{PACK_EXTENSION}</code> file. Pack import validates the
        container, canonical game JSON, and embedded media before loading. Failures leave the
        active game unchanged.
      </p>

      <div className="pack-import__actions">
        <label className="btn btn--secondary" htmlFor="pack-import-file">
          Choose pack file
        </label>
        <input
          ref={inputRef}
          id="pack-import-file"
          className="pack-import__file"
          data-testid="pack-import-file"
          type="file"
          accept={PACK_EXTENSION}
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void runImport(file)
          }}
        />
      </div>

      <div className="foundation__panel" aria-label="Pack import diagnostics">
        <h4>Pack import diagnostics (host-only)</h4>
        <dl className="foundation__kv">
          <dt>active game</dt>
          <dd data-testid="pack-import-active-game">
            {activeGame ? `${activeGame.definition.title} (${activeGame.definition.id})` : 'none'}
          </dd>
          <dt>last attempted import</dt>
          <dd data-testid="pack-import-attempt-count">
            {attempt ? `attempt #${attempt.attemptNumber}` : 'none yet'}
          </dd>
        </dl>
        {attempt === null ? (
          <p className="host__note" data-testid="pack-import-result">
            No pack import attempted yet.
          </p>
        ) : (
          <PackImportOutcome attempt={attempt} />
        )}
      </div>
    </section>
  )
}

function PackImportOutcome({ attempt }: { readonly attempt: Attempt }) {
  if (attempt.result.status === 'success') {
    const mediaCount = attempt.result.mediaAssets.length
    return (
      <div className="pack-import__result pack-import__result--ok" data-testid="pack-import-result">
        <p className="pack-import__headline">
          Pack import succeeded
          {attempt.load.kind === 'loaded' ? ' — game loaded.' : ' — validated but NOT loaded.'}
        </p>
        {attempt.load.kind === 'not-loaded' && (
          <p className="host__note">{attempt.load.reason}</p>
        )}
        <dl className="foundation__kv">
          <dt>game id</dt>
          <dd>{attempt.result.definition.id}</dd>
          <dt>embedded media</dt>
          <dd data-testid="pack-import-media-count">{mediaCount}</dd>
        </dl>
      </div>
    )
  }

  return (
    <div className="pack-import__result pack-import__result--bad" data-testid="pack-import-result">
      <p className="pack-import__headline">
        Pack import failed — no game was loaded ({attempt.result.issues.length}{' '}
        {attempt.result.issues.length === 1 ? 'problem' : 'problems'}).
      </p>
      <PackIssueList issues={attempt.result.issues} />
    </div>
  )
}

function PackIssueList({ issues }: { readonly issues: readonly PackIssue[] }) {
  return (
    <ol className="pack-import__issues" data-testid="pack-import-issues">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${issue.path}-${index}`} className="pack-import__issue">
          <span className="pack-import__issue-stage">{issue.stage}</span>
          <code className="pack-import__issue-code">{issue.code}</code>
          {issue.path.length > 0 && <code className="pack-import__issue-path">{issue.path}</code>}
          <span className="pack-import__issue-message">{issue.message}</span>
          {issue.importIssues && issue.importIssues.length > 0 && (
            <ul className="pack-import__nested" data-testid="pack-import-nested-issues">
              {issue.importIssues.map((nested, nestedIndex) => (
                <li key={`${nested.code}-${nested.path}-${nestedIndex}`}>
                  <code>{nested.code}</code>
                  {nested.path.length > 0 && <code>{nested.path}</code>}
                  <span>{nested.message}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}

async function defaultReadFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}
