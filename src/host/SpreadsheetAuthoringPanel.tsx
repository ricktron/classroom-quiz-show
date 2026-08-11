import { useEffect, useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import type { PrivateGameState } from '../state/privateState'
import type { RoundRegistry } from '../game/registry'
import type { GameDefinition } from '../game/gameDefinition'
import {
  applyDraftCorrection,
  approveAndImportDraft,
  downloadWorkbookTemplate,
  parseWorkbookBytes,
  type AuthoringDraft,
  type AuthoringIssue,
  type DraftCorrection,
} from '../authoring'
import { ensureSession } from './ensureSession'
import './SpreadsheetAuthoringPanel.css'

/**
 * Host-only spreadsheet authoring surface (Slice 20).
 *
 * Progressive disclosure: download templates → upload workbook → review draft →
 * bounded correction → explicit approve → canonical importer → optional load.
 */

export interface SpreadsheetAuthoringPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly registry: RoundRegistry
  readonly hasSession: boolean
  readonly activeGame: PrivateGameState | null
  /** Test seam for jsdom File.arrayBuffer gaps. */
  readonly readFileBytes?: (file: File) => Promise<Uint8Array>
  readonly downloadTemplate?: typeof downloadWorkbookTemplate
}

type LoadOutcome =
  | { readonly kind: 'none' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'not-loaded'; readonly reason: string }

interface TrustedResult {
  readonly definition: GameDefinition
  readonly jsonText: string
  readonly filename: string
}

async function defaultReadFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

export function SpreadsheetAuthoringPanel({
  dispatch,
  registry,
  hasSession,
  activeGame,
  readFileBytes = defaultReadFileBytes,
  downloadTemplate = downloadWorkbookTemplate,
}: SpreadsheetAuthoringPanelProps) {
  const [filename, setFilename] = useState<string | null>(null)
  const [draft, setDraft] = useState<AuthoringDraft | null>(null)
  const [parseIssues, setParseIssues] = useState<readonly AuthoringIssue[]>([])
  const [trusted, setTrusted] = useState<TrustedResult | null>(null)
  const [load, setLoad] = useState<LoadOutcome>({ kind: 'none' })
  const [busy, setBusy] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  useEffect(() => {
    // Freshness: selecting a new workbook clears prior success in clearAll().
  }, [filename])

  function clearAll(): void {
    setDraft(null)
    setParseIssues([])
    setTrusted(null)
    setLoad({ kind: 'none' })
    setApproveError(null)
  }

  async function onFileSelected(file: File | null): Promise<void> {
    if (!file) return
    clearAll()
    setFilename(file.name)
    setBusy(true)
    try {
      const bytes = await readFileBytes(file)
      const parsed = await parseWorkbookBytes(bytes, file.name)
      if (parsed.status === 'failure') {
        setParseIssues(parsed.issues)
        setDraft(null)
        return
      }
      setDraft(parsed.draft)
      setParseIssues(parsed.draft.issues)
    } finally {
      setBusy(false)
    }
  }

  function applyCorrection(correction: DraftCorrection): void {
    if (!draft) return
    const next = applyDraftCorrection(draft, correction)
    setDraft(next)
    setParseIssues(next.issues)
    setTrusted(null)
    setLoad({ kind: 'none' })
    setApproveError(null)
  }

  function onApprove(): void {
    if (!draft || !filename) return
    setApproveError(null)
    const result = approveAndImportDraft(draft, { registry })
    if (result.status !== 'success') {
      setDraft(result.draft)
      setParseIssues(result.draft.issues)
      setApproveError('Approval/import failed. See diagnostics. No active game was changed.')
      setTrusted(null)
      return
    }
    setDraft(result.draft)
    setParseIssues(result.draft.issues)
    setTrusted({
      definition: result.importResult.definition,
      jsonText: result.jsonText,
      filename,
    })
  }

  function onLoadTrusted(): void {
    if (!trusted) return
    const session = ensureSession(hasSession, dispatch)
    if (session.status === 'failed') {
      setLoad({ kind: 'not-loaded', reason: session.reason })
      return
    }
    const dispatched = dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: Date.now(),
      definition: trusted.definition,
    })
    setLoad(
      dispatched.status === 'accepted'
        ? { kind: 'loaded' }
        : { kind: 'not-loaded', reason: `The session rejected the game (${dispatched.reason}).` },
    )
  }

  const blockers = parseIssues.filter((i) => i.severity === 'blocker')
  const warnings = parseIssues.filter((i) => i.severity === 'warning')
  const canApprove = draft !== null && draft.status !== 'blocked' && blockers.length === 0
  const categoryCount = draft?.board.categories.length ?? 0
  const clueCount =
    draft?.board.categories.reduce((sum, category) => sum + category.clues.length, 0) ?? 0

  return (
    <section className="spreadsheet-authoring" aria-labelledby="spreadsheet-authoring-title">
      <h3 id="spreadsheet-authoring-title">Spreadsheet authoring</h3>
      <p className="host__note">
        Download a template, fill it manually or with a model-neutral external authoring tool,
        upload the <code>.xlsx</code> workbook, review diagnostics, approve, then load through the
        existing import boundary. Workbooks never become playable without explicit approval. If no
        game session exists yet, loading starts one automatically.
      </p>

      <div className="spreadsheet-authoring__actions" role="group" aria-label="Workbook templates">
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="spreadsheet-download-classic"
          onClick={() => downloadTemplate('classic-board')}
        >
          Download Classic Board Template
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="spreadsheet-download-final"
          onClick={() => downloadTemplate('board-plus-final')}
        >
          Download Board + Final Template
        </button>
      </div>

      <label className="spreadsheet-authoring__label" htmlFor="spreadsheet-upload">
        Upload workbook (.xlsx)
      </label>
      <input
        id="spreadsheet-upload"
        data-testid="spreadsheet-upload"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          void onFileSelected(file)
          event.target.value = ''
        }}
      />

      <dl className="foundation__kv" aria-label="Workbook selection">
        <dt>selected workbook</dt>
        <dd data-testid="spreadsheet-filename">{filename ?? 'none'}</dd>
        <dt>detected profile</dt>
        <dd data-testid="spreadsheet-profile">{draft?.profile ?? '—'}</dd>
        <dt>workbook format</dt>
        <dd data-testid="spreadsheet-format-version">
          {draft ? draft.workbookFormatVersion : '—'}
        </dd>
        <dt>draft status</dt>
        <dd data-testid="spreadsheet-draft-status">{draft?.status ?? '—'}</dd>
        <dt>busy</dt>
        <dd data-testid="spreadsheet-busy">{busy ? 'yes' : 'no'}</dd>
      </dl>

      {draft && (
        <div className="foundation__panel" data-testid="spreadsheet-review" aria-label="Draft review">
          <h4>Draft review</h4>
          <dl className="foundation__kv">
            <dt>game title</dt>
            <dd data-testid="spreadsheet-review-title">{draft.game.title}</dd>
            <dt>categories</dt>
            <dd data-testid="spreadsheet-review-categories">{categoryCount}</dd>
            <dt>clues</dt>
            <dd data-testid="spreadsheet-review-clues">{clueCount}</dd>
            <dt>final present</dt>
            <dd data-testid="spreadsheet-review-final">{draft.final ? 'yes' : 'no'}</dd>
            <dt>blockers</dt>
            <dd data-testid="spreadsheet-review-blockers">{blockers.length}</dd>
            <dt>warnings</dt>
            <dd data-testid="spreadsheet-review-warnings">{warnings.length}</dd>
            <dt>approval will</dt>
            <dd>
              Compile canonical schema-1 JSON and re-enter{' '}
              <code>importGameFromJsonText</code>. Gameplay does not start automatically.
            </dd>
          </dl>

          <div className="spreadsheet-authoring__board" data-testid="spreadsheet-board-summary">
            {draft.board.categories.map((category) => (
              <div key={category.canonicalId} className="spreadsheet-authoring__category">
                <strong>
                  {category.order}. {category.title}
                </strong>
                <ul>
                  {category.clues.map((clue) => (
                    <li key={clue.tileCanonicalId}>
                      {clue.clueOrder}. ({clue.value}) {clue.prompt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="spreadsheet-authoring__corrections" data-testid="spreadsheet-corrections">
            <h4>Bounded corrections</h4>
            <label>
              Game title
              <input
                data-testid="spreadsheet-correct-title"
                value={draft.game.title}
                onChange={(event) =>
                  applyCorrection({ kind: 'game-title', title: event.target.value })
                }
              />
            </label>
            {draft.board.categories[0] && (
              <label>
                First category title
                <input
                  data-testid="spreadsheet-correct-category"
                  value={draft.board.categories[0].title}
                  onChange={(event) =>
                    applyCorrection({
                      kind: 'category-title',
                      categoryOrder: draft.board.categories[0]!.order,
                      title: event.target.value,
                    })
                  }
                />
              </label>
            )}
            {draft.board.categories[0]?.clues[0] && (
              <label>
                First clue answer
                <input
                  data-testid="spreadsheet-correct-answer"
                  value={draft.board.categories[0].clues[0].answer}
                  onChange={(event) =>
                    applyCorrection({
                      kind: 'clue-field',
                      categoryOrder: draft.board.categories[0]!.order,
                      clueOrder: draft.board.categories[0]!.clues[0]!.clueOrder,
                      field: 'answer',
                      value: event.target.value,
                    })
                  }
                />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="foundation__panel" aria-label="Authoring diagnostics">
        <h4>Authoring diagnostics (host-only)</h4>
        {parseIssues.length === 0 ? (
          <p data-testid="spreadsheet-diagnostics-empty">No diagnostics.</p>
        ) : (
          <ul data-testid="spreadsheet-diagnostics">
            {parseIssues.map((issue, index) => (
              <li key={`${issue.code}-${index}`} data-testid="spreadsheet-diagnostic">
                <strong>{issue.severity}</strong> [{issue.code}] {issue.message}
                {issue.sheet ? ` · ${issue.sheet}` : ''}
                {issue.a1 ? ` · ${issue.a1}` : ''}
                {issue.field ? ` · ${issue.field}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="spreadsheet-authoring__actions">
        <button
          type="button"
          className="btn"
          data-testid="spreadsheet-approve"
          disabled={!canApprove}
          onClick={onApprove}
        >
          Approve and import
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="spreadsheet-load"
          disabled={!trusted}
          onClick={onLoadTrusted}
        >
          Load approved game
        </button>
      </div>

      {approveError && (
        <p className="spreadsheet-authoring__error" data-testid="spreadsheet-approve-error">
          {approveError}
        </p>
      )}

      <dl className="foundation__kv" aria-label="Approval outcome">
        <dt>trusted import</dt>
        <dd data-testid="spreadsheet-trusted">
          {trusted ? `${trusted.definition.title} (${trusted.definition.id})` : 'none'}
        </dd>
        <dt>active game</dt>
        <dd data-testid="spreadsheet-active-game">
          {activeGame ? `${activeGame.definition.title} (${activeGame.definition.id})` : 'none'}
        </dd>
        <dt>load outcome</dt>
        <dd data-testid="spreadsheet-load-outcome">
          {load.kind === 'none'
            ? 'none'
            : load.kind === 'loaded'
              ? 'loaded'
              : `not-loaded: ${load.reason}`}
        </dd>
      </dl>
    </section>
  )
}
