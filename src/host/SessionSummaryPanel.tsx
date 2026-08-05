import { deriveSessionSummaryV1 } from '../summary/deriveSessionSummary'
import type {
  SessionSummaryCategoryBoardRoundV1,
  SessionSummaryFinalSectionV1,
  SessionSummaryResultV1,
  SessionSummaryStandingV1,
  SessionSummaryTerminalPathV1,
  SessionSummaryUnavailableRoundV1,
  SessionSummaryV1,
} from '../summary/contract'
import type { SessionEvent } from '../state/events'
import type { PrivateGameState } from '../state/privateState'
import './SessionSummaryPanel.css'

/**
 * Host-only end-of-session summary surface (Slice 15).
 *
 * Visible only when the replayed game lifecycle is `ended`. Derivation stays in
 * `src/summary/` — this panel only presents the typed result. No export,
 * download, saved history, comparison, projector controls, or analytics.
 */

export interface SessionSummaryPanelProps {
  readonly game: PrivateGameState
  readonly history: readonly SessionEvent[]
  readonly saveStatus?: 'idle' | 'saving' | 'saved' | 'failed'
  readonly saveMessage?: string
  readonly onRetrySave?: () => void
  readonly onDeleteSavedCopy?: () => void
}

export interface SessionSummaryViewProps {
  readonly summary: SessionSummaryV1
}

const TERMINAL_PATH_LABEL: Readonly<Record<SessionSummaryTerminalPathV1, string>> = {
  'ordinary-or-host-ended': 'Ordinary or host-ended session',
  'final-unique-winner': 'Final unique-winner completion',
  'final-accepted-tied-finish': 'Final accepted tied finish',
  'final-sudden-death-winner': 'Final sudden-death winner',
}

export function SessionSummaryPanel({
  game,
  history,
  saveStatus = 'idle',
  saveMessage,
  onRetrySave,
  onDeleteSavedCopy,
}: SessionSummaryPanelProps) {
  if (game.gameLifecycle !== 'ended') {
    return null
  }

  const result = deriveSessionSummaryV1(history)
  if (result.status !== 'available') {
    return (
      <section className="ssp" aria-labelledby="ssp-title" data-testid="session-summary-panel">
        <div className="foundation__tag foundation__tag--slice15">
          Session summary (Slice 15) — host-only, current session
        </div>
        <h3 id="ssp-title">Session summary</h3>
        <p className="host__note" data-testid="ssp-unavailable">
          {unavailableCopy(result)}
        </p>
      </section>
    )
  }

  const { summary } = result
  return (
    <section className="ssp ssp--primary" aria-labelledby="ssp-title" data-testid="session-summary-panel">
      <div className="foundation__tag foundation__tag--slice15">
        Session summary (Slice 15) — host-only, current session
      </div>
      <h3 id="ssp-title">Session summary</h3>

      <p className="ssp__warning" role="status" data-testid="ssp-current-session-warning">
        {saveStateCopy(saveStatus, saveMessage)}
      </p>
      {saveStatus === 'failed' && onRetrySave && (
        <button type="button" className="btn" onClick={onRetrySave}>
          Retry saving summary
        </button>
      )}
      {saveStatus === 'saved' && onDeleteSavedCopy && (
        <button type="button" className="btn btn--secondary" onClick={onDeleteSavedCopy}>
          Delete saved copy
        </button>
      )}

      <SessionSummaryView summary={summary} />
    </section>
  )
}

export function SessionSummaryView({ summary }: SessionSummaryViewProps) {
  return (
    <>
      <CompletionSection summary={summary} />
      <StandingsSection standings={summary.scoreActivity.derived.standings} />
      <ScoringSection summary={summary} />
      <CategoryBoardsSection summary={summary} />
      <UnavailableRoundsSection rounds={summary.unavailableRounds} />
      <TimerBuzzSection summary={summary} />
      <FinalSection finalWager={summary.finalWager} />
    </>
  )
}

function saveStateCopy(
  status: NonNullable<SessionSummaryPanelProps['saveStatus']>,
  message?: string,
): string {
  if (message) return message
  switch (status) {
    case 'saving':
      return 'Saving this completed summary locally.'
    case 'saved':
      return 'This completed summary is saved locally in the host ledger.'
    case 'failed':
      return 'The summary remains available in this host session, but its local copy was not saved.'
    case 'idle':
      return 'The summary is available for this completed host session. Local save status is not yet available.'
  }
}

function unavailableCopy(result: Exclude<SessionSummaryResultV1, { status: 'available' }>): string {
  switch (result.status) {
    case 'no-session':
      return 'No session is available to summarize.'
    case 'no-game':
      return 'No game is available to summarize.'
    case 'active-or-incomplete':
      return 'The game is still active or incomplete, so no completed-session summary is available.'
    case 'invalid-history':
      return `The session history cannot be summarized (${result.reason}).`
  }
}

function CompletionSection({ summary }: { readonly summary: SessionSummaryV1 }) {
  return (
    <section className="ssp__block" aria-label="Completion">
      <h4>Completion</h4>
      <dl className="ssp__kv">
        <dt>Completion context</dt>
        <dd data-testid="ssp-terminal-path">{TERMINAL_PATH_LABEL[summary.terminalPath]}</dd>
        <dt>Game</dt>
        <dd data-testid="ssp-game-title">{summary.gameTitle}</dd>
        <dt>Session id</dt>
        <dd data-testid="ssp-session-id">{summary.sessionId}</dd>
        <dt>Recorded session start</dt>
        <dd data-testid="ssp-start-stamp">{formatStamp(summary.recordedSessionStartAt)}</dd>
        <dt>Recorded completion</dt>
        <dd data-testid="ssp-completion-stamp">{formatStamp(summary.recordedCompletionAt)}</dd>
      </dl>
    </section>
  )
}

function StandingsSection({
  standings,
}: {
  readonly standings: readonly SessionSummaryStandingV1[]
}) {
  return (
    <section className="ssp__block" aria-label="Final standings">
      <h4>Final standings</h4>
      {standings.length === 0 ? (
        <p className="host__note" data-testid="ssp-standings-empty">
          No teams are configured, so standings are unavailable.
        </p>
      ) : (
        <table className="ssp__table" data-testid="ssp-standings">
          <caption className="ssp__caption">Final standings with shared-rank ties</caption>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Team</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.teamId}>
                <td>{placementLabel(row)}</td>
                <td>{row.teamName}</td>
                <td>{formatSigned(row.finalScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function ScoringSection({ summary }: { readonly summary: SessionSummaryV1 }) {
  const observed = summary.scoreActivity.observed
  return (
    <section className="ssp__block" aria-label="Scoring summary">
      <h4>Scoring summary</h4>
      <p className="host__note">
        Descriptive score activity only. No accuracy, mastery, grades, or
        performance ratings are computed.
      </p>
      <dl className="ssp__kv" data-testid="ssp-scoring">
        <dt>Score changes</dt>
        <dd>{observed.scoreChangeCount}</dd>
        <dt>Tile-linked adjustments</dt>
        <dd>{observed.tileLinkedAdjustmentCount}</dd>
        <dt>Manual adjustments</dt>
        <dd>{observed.manualAdjustmentCount}</dd>
        <dt>Final settlements</dt>
        <dd>{observed.finalSettlementCount}</dd>
      </dl>
      {observed.perTeam.length > 0 && (
        <table className="ssp__table" data-testid="ssp-scoring-teams">
          <caption className="ssp__caption">Per-team score activity</caption>
          <thead>
            <tr>
              <th scope="col">Team</th>
              <th scope="col">Changes</th>
              <th scope="col">Net delta</th>
              <th scope="col">Final score</th>
            </tr>
          </thead>
          <tbody>
            {observed.perTeam.map((row) => (
              <tr key={row.teamId}>
                <td>{row.teamName}</td>
                <td>{row.scoreChangeCount}</td>
                <td>{formatSigned(row.netDelta)}</td>
                <td>{formatSigned(row.finalScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function CategoryBoardsSection({ summary }: { readonly summary: SessionSummaryV1 }) {
  const section = summary.categoryBoards
  return (
    <section className="ssp__block" aria-label="Category boards">
      <h4>Category boards</h4>
      {section.kind === 'none' ? (
        <p className="host__note" data-testid="ssp-boards-none">
          No category-board rounds are present in this game.
        </p>
      ) : (
        section.rounds.map((round) => <CategoryBoardRound key={round.roundId} round={round} />)
      )}
    </section>
  )
}

function CategoryBoardRound({ round }: { readonly round: SessionSummaryCategoryBoardRoundV1 }) {
  return (
    <div className="ssp__round" data-testid={`ssp-board-${round.roundId}`}>
      <h5>{round.roundTitle}</h5>
      <dl className="ssp__kv">
        <dt>Tile selections</dt>
        <dd>{round.observed.tileSelections}</dd>
        <dt>Prompt reveals</dt>
        <dd>{round.observed.promptReveals}</dd>
        <dt>Answer reveals</dt>
        <dd>{round.observed.answerReveals}</dd>
        <dt>Returns to board</dt>
        <dd>{round.observed.returnsToBoard}</dd>
        <dt>Tile-linked score adjustments</dt>
        <dd>{round.observed.tileLinkedScoreAdjustments}</dd>
        <dt>Accepted buzzes</dt>
        <dd>{round.observed.acceptedBuzzes}</dd>
        <dt>Active-response resolutions</dt>
        <dd>{round.observed.activeResponseResolutions}</dd>
        <dt>Timer starts / pauses / resumes / expirations / interruptions / resets</dt>
        <dd>
          {round.observed.timerStarts} / {round.observed.timerPauses} /{' '}
          {round.observed.timerResumes} / {round.observed.timerExpirations} /{' '}
          {round.observed.timerInterruptions} / {round.observed.timerResets}
        </dd>
        <dt>Total tiles</dt>
        <dd>{round.derived.totalTiles}</dd>
        <dt>Consumed tiles</dt>
        <dd>{round.derived.consumedTiles}</dd>
        <dt>Consumed without tile-linked score</dt>
        <dd>{round.derived.consumedTilesWithoutTileLinkedScore}</dd>
        <dt>Categories cleared</dt>
        <dd>
          {round.derived.clearedCategories} of {round.derived.totalCategories}
        </dd>
      </dl>
    </div>
  )
}

function UnavailableRoundsSection({
  rounds,
}: {
  readonly rounds: readonly SessionSummaryUnavailableRoundV1[]
}) {
  return (
    <section className="ssp__block" aria-label="Unavailable rounds">
      <h4>Unavailable rounds</h4>
      {rounds.length === 0 ? (
        <p className="host__note" data-testid="ssp-unavailable-rounds-none">
          Every authored round in this game has a Session Summary V1 section.
        </p>
      ) : (
        <ul className="ssp__list" data-testid="ssp-unavailable-rounds">
          {rounds.map((round) => (
            <li
              key={round.roundId}
              data-testid={`ssp-unavailable-round-${round.roundId}`}
            >
              <strong>{round.roundTitle}</strong> is unavailable for summary
              because Session Summary V1 does not support authored round type{' '}
              <code>{round.authoredRoundType}</code> (
              {unavailableRoundReasonCopy(round.reason)}). No gameplay metrics
              are invented for this round.
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function unavailableRoundReasonCopy(
  reason: SessionSummaryUnavailableRoundV1['reason'],
): string {
  switch (reason) {
    case 'unsupported-round-type':
      return 'unsupported round type'
  }
}

function TimerBuzzSection({ summary }: { readonly summary: SessionSummaryV1 }) {
  const timer = summary.timerActivity.observed
  const buzz = summary.buzzActivity.observed
  return (
    <section className="ssp__block" aria-label="Timer and buzz activity">
      <h4>Timer and buzz activity</h4>
      <p className="host__note">
        Transition and acceptance counts only. Session duration, reaction time,
        and fairness claims are not calculated. Timer resets count only when a
        response-phase reset cleared a non-idle timer.
      </p>
      <dl className="ssp__kv" data-testid="ssp-timer-buzz">
        <dt>Timer starts</dt>
        <dd>{timer.starts}</dd>
        <dt>Timer pauses</dt>
        <dd>{timer.pauses}</dd>
        <dt>Timer resumes</dt>
        <dd>{timer.resumes}</dd>
        <dt>Timer expirations</dt>
        <dd>{timer.expirations}</dd>
        <dt>Timer interruptions</dt>
        <dd>{timer.interruptions}</dd>
        <dt>Timer resets</dt>
        <dd>{timer.resets}</dd>
        <dt>Accepted buzzes</dt>
        <dd>{buzz.acceptedBuzzCount}</dd>
        <dt>Active-response resolutions</dt>
        <dd>{buzz.activeResponseResolutionCount}</dd>
      </dl>
    </section>
  )
}

function FinalSection({ finalWager }: { readonly finalWager: SessionSummaryFinalSectionV1 }) {
  return (
    <section className="ssp__block" aria-label="Final Wager">
      <h4>Final Wager</h4>
      {finalWager.kind === 'unavailable' ? (
        <p className="host__note" data-testid="ssp-final-unavailable">
          {finalUnavailableCopy(finalWager.reason)}
        </p>
      ) : (
        <>
          <p className="host__note">
            Aggregate host-private facts only. Exact wagers, response text, notes,
            and alternates are not retained in this summary.
          </p>
          <dl className="ssp__kv" data-testid="ssp-final">
            <dt>Round</dt>
            <dd>{finalWager.roundTitle}</dd>
            <dt>Eligibility mode</dt>
            <dd>{finalWager.observed.eligibilityMode}</dd>
            <dt>Eligible teams</dt>
            <dd>{finalWager.observed.eligibleTeamCount}</dd>
            <dt>Wager-entry events</dt>
            <dd>{finalWager.observed.wagerEntryEventCount}</dd>
            <dt>Response-entry events</dt>
            <dd>{finalWager.observed.responseEntryEventCount}</dd>
            <dt>Settlements</dt>
            <dd>{finalWager.observed.settlementCount}</dd>
            <dt>Distinct wager participants</dt>
            <dd>{finalWager.derived.distinctWagerParticipantCount}</dd>
            <dt>Response states (exact / not captured / no response)</dt>
            <dd>
              {finalWager.derived.responseStateCounts.exact} /{' '}
              {finalWager.derived.responseStateCounts.notCaptured} /{' '}
              {finalWager.derived.responseStateCounts.noResponse}
            </dd>
            <dt>Settlement outcomes (correct / incorrect / no response)</dt>
            <dd>
              {finalWager.derived.settlementOutcomeCounts.correct} /{' '}
              {finalWager.derived.settlementOutcomeCounts.incorrect} /{' '}
              {finalWager.derived.settlementOutcomeCounts.noResponse}
            </dd>
            <dt>Final resolution path</dt>
            <dd data-testid="ssp-final-resolution">
              {finalResolutionCopy(finalWager.derived.resolutionPath)}
            </dd>
            <dt>Wager-window transitions (start / pause / resume / expire)</dt>
            <dd>
              {finalWager.observed.wagerWindow.starts} / {finalWager.observed.wagerWindow.pauses}{' '}
              / {finalWager.observed.wagerWindow.resumes} /{' '}
              {finalWager.observed.wagerWindow.expirations}
            </dd>
            <dt>Response-window transitions (start / pause / resume / expire)</dt>
            <dd>
              {finalWager.observed.responseWindow.starts} /{' '}
              {finalWager.observed.responseWindow.pauses} /{' '}
              {finalWager.observed.responseWindow.resumes} /{' '}
              {finalWager.observed.responseWindow.expirations}
            </dd>
          </dl>
        </>
      )}
    </section>
  )
}

function finalUnavailableCopy(
  reason: Extract<SessionSummaryFinalSectionV1, { kind: 'unavailable' }>['reason'],
): string {
  switch (reason) {
    case 'no-final-round':
      return 'No Final Wager round is present in this game.'
    case 'final-not-begun':
      return 'Final Wager did not begin in this session.'
    case 'final-incomplete':
      return 'Final Wager information is incomplete and unavailable.'
    case 'unsupported-final-state':
      return 'Final Wager state is unsupported for summary.'
  }
}

function finalResolutionCopy(
  path: Extract<SessionSummaryFinalSectionV1, { kind: 'available' }>['derived']['resolutionPath'],
): string {
  switch (path) {
    case 'unique-winner':
      return 'Unique winner'
    case 'accepted-tied-finish':
      return 'Accepted tied finish'
    case 'sudden-death-winner':
      return 'Sudden-death winner'
    case 'host-ended-incomplete':
      return 'Host-ended incomplete Final'
    case 'zero-eligible-complete':
      return 'Zero eligible teams — completed on pre-Final scores'
  }
}

function placementLabel(row: SessionSummaryStandingV1): string {
  if (row.tied) return `Tied for ${ordinal(row.rank)}`
  return ordinal(row.rank)
}

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** Signed decimal for negative values — meaning is never color-only. */
function formatSigned(value: number): string {
  if (value < 0) return `−${Math.abs(value)}`
  return String(value)
}

/**
 * Recorded stamps are lifecycle evidence, not a guaranteed semantic duration.
 * Render the numeric stamp so the UI stays locale-independent under test.
 */
function formatStamp(value: number): string {
  return String(value)
}
