import { useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import type { PrivateGameState } from '../state/privateState'
import type { RoundRegistry } from '../game/registry'
import { importGameFromJsonText } from '../import/importGame'
import type { ImportResult } from '../import/result'
import {
  CANONICAL_SAMPLE_CATEGORY_BOARD_FILE,
  CANONICAL_SAMPLE_GAME_FILE,
  CANONICAL_SAMPLE_WITH_DUPLICATE_TEAM_ID,
  CANONICAL_SAMPLE_WITH_DUPLICATE_TILE_ID,
  CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE,
} from '../import/sampleGameFile'
import './GameImportPanel.css'

/**
 * Host-only game-import harness (Slice 4).
 *
 * This is the minimum useful transport adapter that proves the canonical
 * pipeline end to end: paste JSON → validate → either load through the existing
 * `INITIALIZE_GAME` command or show structured, actionable issues.
 *
 * Deliberate properties:
 *  - It is a THIN adapter. It contains no validation logic of its own; it hands
 *    text to `importGameFromJsonText` and renders the result.
 *  - The built-in samples are JSON TEXT, so they travel the same untrusted path
 *    as anything a teacher pastes — no privileged shortcut.
 *  - Validation runs independently of session state, so a failed import is
 *    provably incapable of touching the store: nothing is dispatched.
 *  - Everything rendered here is HOST-ONLY. Raw JSON, issue paths, codes, and
 *    registry details never enter `PublicState` and so can never reach the
 *    display.
 *  - "Active game", "last attempted import", and "last import result" are three
 *    distinct things and are labelled as such, so a stale success can never be
 *    mistaken for a fresh one.
 */

export interface GameImportPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly registry: RoundRegistry
  readonly hasSession: boolean
  readonly activeGame: PrivateGameState | null
}

/** What happened to the store as a result of the last import attempt. */
type LoadOutcome =
  | { readonly kind: 'none' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'not-loaded'; readonly reason: string }

interface Attempt {
  readonly result: ImportResult
  readonly load: LoadOutcome
  /** Increments per attempt so a repeated identical failure is visibly fresh. */
  readonly attemptNumber: number
}

export function GameImportPanel({
  dispatch,
  registry,
  hasSession,
  activeGame,
}: GameImportPanelProps) {
  const [text, setText] = useState('')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)

  function runImport(): void {
    const attemptNumber = attemptCount + 1
    setAttemptCount(attemptNumber)

    // The ONE pipeline. No alternate path for samples, pastes, or tests.
    const result = importGameFromJsonText(text, { registry })

    if (result.status !== 'success') {
      // Nothing is dispatched: a failed import cannot reach the store at all.
      setAttempt({ result, load: { kind: 'none' }, attemptNumber })
      return
    }

    if (!hasSession) {
      setAttempt({
        result,
        load: { kind: 'not-loaded', reason: 'Initialize a session first, then import again.' },
        attemptNumber,
      })
      return
    }

    const dispatched = dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: Date.now(),
      definition: result.definition,
    })
    setAttempt({
      result,
      load:
        dispatched.status === 'accepted'
          ? { kind: 'loaded' }
          : { kind: 'not-loaded', reason: `The session rejected the game (${dispatched.reason}).` },
      attemptNumber,
    })
  }

  return (
    <section className="import" aria-labelledby="import-title">
      <div className="foundation__tag foundation__tag--slice4">
        Validation &amp; import pipeline (Slice 4) — host-only, not gameplay
      </div>
      <h3 id="import-title">Import a game file</h3>
      <p className="host__note">
        Paste a canonical <code>classroom-quiz-show/game</code> JSON file. Every import —
        including the built-in samples — is validated by the same pipeline. Nothing is
        loaded unless validation succeeds.
      </p>

      <div className="import__actions" role="group" aria-label="Sample game files">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setText(CANONICAL_SAMPLE_GAME_FILE)}
        >
          Load valid sample file
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setText(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE)}
        >
          Load category-board sample file
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setText(CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE)}
        >
          Load sample with unregistered round type
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setText(CANONICAL_SAMPLE_WITH_DUPLICATE_TILE_ID)}
        >
          Load sample with a duplicate tile id
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setText(CANONICAL_SAMPLE_WITH_DUPLICATE_TEAM_ID)}
        >
          Load sample with a duplicate team id
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setText('')
            setAttempt(null)
          }}
        >
          Clear
        </button>
      </div>

      <label className="import__label" htmlFor="import-json">
        Game file JSON
      </label>
      <textarea
        id="import-json"
        className="import__textarea"
        data-testid="import-json"
        rows={8}
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder='{ "format": "classroom-quiz-show/game", "schemaVersion": 1, … }'
      />

      <div className="import__actions">
        <button type="button" className="btn" data-testid="import-run" onClick={runImport}>
          Import game
        </button>
      </div>

      <div className="foundation__panel" aria-label="Import diagnostics">
        <h4>Import diagnostics (host-only)</h4>
        <dl className="foundation__kv">
          <dt>active game</dt>
          <dd data-testid="import-active-game">
            {activeGame ? `${activeGame.definition.title} (${activeGame.definition.id})` : 'none'}
          </dd>
          <dt>last attempted import</dt>
          <dd data-testid="import-attempt-count">
            {attempt ? `attempt #${attempt.attemptNumber}` : 'none yet'}
          </dd>
        </dl>
        {attempt === null ? (
          <p className="host__note" data-testid="import-result">
            No import attempted yet.
          </p>
        ) : (
          <ImportOutcome attempt={attempt} />
        )}
      </div>
    </section>
  )
}

function ImportOutcome({ attempt }: { readonly attempt: Attempt }) {
  if (attempt.result.status === 'success') {
    const { metadata } = attempt.result
    return (
      <div className="import__result import__result--ok" data-testid="import-result">
        <p className="import__headline">
          Import succeeded
          {attempt.load.kind === 'loaded' ? ' — game loaded.' : ' — validated but NOT loaded.'}
        </p>
        {attempt.load.kind === 'not-loaded' && (
          <p className="host__note">{attempt.load.reason}</p>
        )}
        <dl className="foundation__kv">
          <dt>format</dt>
          <dd>{metadata.format}</dd>
          <dt>schema version</dt>
          <dd>{metadata.schemaVersion}</dd>
          <dt>game id</dt>
          <dd>{metadata.gameId}</dd>
          <dt>rounds</dt>
          <dd data-testid="import-round-count">{metadata.roundCount}</dd>
        </dl>
      </div>
    )
  }

  return (
    <div className="import__result import__result--bad" data-testid="import-result">
      <p className="import__headline">
        Import failed — no game was loaded ({attempt.result.issues.length}{' '}
        {attempt.result.issues.length === 1 ? 'problem' : 'problems'}).
      </p>
      <ol className="import__issues" data-testid="import-issues">
        {attempt.result.issues.map((issue, index) => (
          <li key={`${issue.code}-${issue.path}-${index}`} className="import__issue">
            <span className="import__issue-stage">{issue.stage}</span>
            <code className="import__issue-code">{issue.code}</code>
            {issue.path.length > 0 && <code className="import__issue-path">{issue.path}</code>}
            <span className="import__issue-message">{issue.message}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
