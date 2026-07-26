import { useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { SessionEvent, TeamScoreAdjustedEvent } from '../state/events'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import {
  categoryBoardStateFor,
  effectiveEvents,
  findUndoTarget,
  teamScoreFor,
} from '../state/reducer'
import { readCategoryBoardDefinition, findTileLocation } from '../game/categoryBoard/definition'
import { teamAccentClass } from '../game/teams/accents'
import type { TeamDefinition } from '../game/teams/definition'
import {
  MAX_SCORE_ADJUSTMENT,
  SCORE_ADJUSTMENT_MODE_LABEL,
  formatSignedDelta,
  fullCreditDelta,
  fullDeductionDelta,
  requiresAdjustmentConfirmation,
  suggestedPartialCredit,
  type ScoreAdjustmentMode,
  type ScoreSource,
} from '../game/teams/scoring'
import { systemClock, type Clock } from '../time/clock'
import './TeamScoringPanel.css'

/**
 * Host controls for teams and scoring (Slice 6).
 *
 * This is the teacher's private scoring surface, and it sits deliberately BESIDE
 * the board panel rather than inside it. Revealing content and awarding points
 * are two different decisions, so they get two different panels: nothing here
 * fires when a tile is revealed, and nothing in the board panel moves a point.
 *
 * ## What it makes explicit
 *
 * A teacher mid-lesson must be able to answer four questions at a glance, so all
 * four are on screen: which tile is live and what it is WORTH, which team is
 * SELECTED, what the proposed adjustment WOULD do (`120 → 220`), and whether it
 * has ALREADY been submitted. Guessing at any of those is how a class ends up
 * arguing about the score.
 *
 * ## Bounded and never authoritative
 *
 * Only actions the reducer will accept are offered, and every amount shown for a
 * tile preset is computed from the SAME trusted board value the planner will
 * re-derive — so the UI cannot invent an amount. The store re-validates
 * everything regardless: a stale panel is inert, not dangerous.
 *
 * ## Guards
 *
 *  - no target selected → every scoring action is disabled;
 *  - no live tile → the tile presets do not exist, only manual correction does;
 *  - an adjustment already submitted for this (team, tile, mode) → that preset is
 *    disabled, derived from the EFFECTIVE event log so undo re-enables it;
 *  - a negative or large manual amount → an explicit confirmation is required.
 *
 * ## Not here
 *
 * No timers, no buzzers or lockout, no wagers, no persistence, no media. The
 * selected scoring target is host state only: it is never broadcast, and it awards
 * nothing by existing (ADR-006 §7).
 */

export interface TeamScoringPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  /** The append-only history, used to derive "already scored" and the undo target. */
  readonly history: readonly SessionEvent[]
  /**
   * The dispatch-edge clock (Slice 7). Injectable so the host surface has exactly
   * one place the real clock enters it — see `src/time/clock.ts`.
   */
  readonly clock?: Clock
}

/** The tile currently open on the board, if one is live and scorable. */
interface LiveTile {
  readonly roundId: string
  readonly tileId: string
  readonly categoryTitle: string
  readonly effectiveValue: number
}

function isTeamScoreAdjusted(event: SessionEvent): event is TeamScoreAdjustedEvent {
  return event.type === 'TEAM_SCORE_ADJUSTED'
}

/**
 * Resolve the live, scorable tile from private state.
 *
 * "Scorable" means the class has seen the question: the `prompt` or `answer`
 * stage. At the `board` and `selected` stages there is nothing to award for yet,
 * and after the host returns to the board the tile is closed — a correction then
 * goes through manual correction, which is exactly what that mode is for.
 */
function liveTileOf(game: PrivateGameState): LiveTile | null {
  if (game.currentRoundIndex === null || game.gameLifecycle !== 'active') return null
  const round = game.definition.rounds[game.currentRoundIndex]
  if (!round) return null
  const board = readCategoryBoardDefinition(round)
  if (board === null) return null
  const progress = categoryBoardStateFor(game, round.id).progress
  if (progress.stage !== 'prompt' && progress.stage !== 'answer') return null
  const location = findTileLocation(board, progress.selectedTileId)
  if (location === null) return null
  return {
    roundId: round.id,
    tileId: progress.selectedTileId,
    categoryTitle: location.category.title,
    effectiveValue: location.tile.effectiveValue,
  }
}

/**
 * Strict integer parse. `Number.parseInt` would happily accept `12abc` and
 * `1e3`; a score is a whole number of points and nothing else, so anything that
 * is not exactly an optionally-signed run of digits is an error the teacher sees
 * rather than a value silently reinterpreted.
 */
function parseIntegerInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

export function TeamScoringPanel({
  dispatch,
  game,
  history,
  clock = systemClock,
}: TeamScoringPanelProps) {
  const teams = game.definition.teams
  const [targetId, setTargetId] = useState<string | null>(null)
  const [partialText, setPartialText] = useState('')
  const [manualText, setManualText] = useState('')
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = game.gameLifecycle === 'active'
  const liveTile = liveTileOf(game)
  const target = teams.find((team) => team.id === targetId) ?? null
  const scoreEvents = effectiveEvents(history).filter(isTeamScoreAdjusted)
  const lastChange = scoreEvents.length === 0 ? null : scoreEvents[scoreEvents.length - 1]
  const undoTarget = findUndoTarget(history)
  const canUndoScore = undoTarget !== null && undoTarget.type === 'TEAM_SCORE_ADJUSTED'

  // A game with no teams has nothing to score. Say so once, host-only, instead of
  // rendering an empty panel the teacher has to interpret.
  if (teams.length === 0) {
    return (
      <section className="tsp" aria-labelledby="tsp-title">
        <div className="foundation__tag foundation__tag--slice6">
          Teams &amp; scoring (Slice 6) — host controls, private
        </div>
        <h3 id="tsp-title">Teams &amp; scoring</h3>
        <p className="host__note" data-testid="tsp-no-teams">
          This game configures no teams, so there is nothing to score. Add a
          <code> teams </code> list to the game file to score it.
        </p>
      </section>
    )
  }

  /** Has this exact (team, tile, mode) adjustment already been recorded? */
  function alreadySubmitted(teamId: string, tileId: string, mode: ScoreAdjustmentMode): boolean {
    return scoreEvents.some(
      (event) =>
        event.teamId === teamId &&
        event.mode === mode &&
        event.source.kind === 'category-board-tile' &&
        event.source.tileId === tileId,
    )
  }

  /**
   * Dispatch one adjustment. The store is the authority: a rejection is surfaced
   * verbatim rather than hidden, because a control that silently does nothing is
   * worse than one that explains itself.
   */
  function adjust(
    teamId: string,
    delta: number,
    mode: ScoreAdjustmentMode,
    source: ScoreSource,
  ): boolean {
    const result = dispatch({ type: 'ADJUST_TEAM_SCORE', issuedAt: clock.now(), teamId, delta, mode, source })
    if (result.status === 'rejected') {
      setError(`The session rejected that adjustment (${result.reason}).`)
      return false
    }
    setError(null)
    return true
  }

  function applyTilePreset(mode: ScoreAdjustmentMode, delta: number): void {
    if (!target || !liveTile) return
    adjust(target.id, delta, mode, {
      kind: 'category-board-tile',
      roundId: liveTile.roundId,
      tileId: liveTile.tileId,
    })
  }

  function applyPartialCredit(): void {
    if (!target || !liveTile) return
    const amount = parseIntegerInput(partialText)
    if (amount === null || amount === 0) {
      setError('Enter a whole number of points other than zero for partial credit.')
      return
    }
    if (Math.abs(amount) > liveTile.effectiveValue) {
      setError(
        `Partial credit cannot exceed the tile's value of ${liveTile.effectiveValue} points. Use a manual correction for anything larger.`,
      )
      return
    }
    const applied = adjust(target.id, amount, 'partial-credit', {
      kind: 'category-board-tile',
      roundId: liveTile.roundId,
      tileId: liveTile.tileId,
    })
    if (applied) setPartialText('')
  }

  function applyManualCorrection(): void {
    if (!target) return
    const amount = parseIntegerInput(manualText)
    if (amount === null || amount === 0) {
      setError('Enter a whole number of points other than zero — for example 25, or -50.')
      return
    }
    if (Math.abs(amount) > MAX_SCORE_ADJUSTMENT) {
      setError(`A single adjustment may be at most ${MAX_SCORE_ADJUSTMENT} points.`)
      return
    }
    if (requiresAdjustmentConfirmation(amount) && !manualConfirmed) {
      setError('Tick the confirmation box before applying a negative or large adjustment.')
      return
    }
    if (adjust(target.id, amount, 'manual-correction', { kind: 'manual' })) {
      setManualText('')
      setManualConfirmed(false)
    }
  }

  const manualAmount = parseIntegerInput(manualText)
  const manualNeedsConfirmation = manualAmount !== null && requiresAdjustmentConfirmation(manualAmount)
  const partialAmount = parseIntegerInput(partialText)
  const targetScore = target === null ? null : teamScoreFor(game, target.id)

  return (
    <section className="tsp" aria-labelledby="tsp-title">
      <div className="foundation__tag foundation__tag--slice6">
        Teams &amp; scoring (Slice 6) — host controls, private
      </div>
      <h3 id="tsp-title">Teams &amp; scoring</h3>

      <ol className="tsp__board" data-testid="tsp-scoreboard">
        {teams.map((team) => (
          <li className="tsp__team" key={team.id} data-testid={`tsp-team-${team.id}`}>
            <span
              className={`tsp__swatch ${teamAccentClass(team.accent)}`}
              aria-hidden="true"
            />
            {/* The NAME identifies the team; the swatch is decoration only. */}
            <span className="tsp__team-name">{team.name}</span>
            <span className="tsp__team-score" data-testid={`tsp-score-${team.id}`}>
              {teamScoreFor(game, team.id)}
            </span>
          </li>
        ))}
      </ol>

      <fieldset className="tsp__targets" disabled={!active}>
        <legend>Scoring target (host only — never shown on the display)</legend>
        {teams.map((team) => (
          <label className="tsp__target" key={team.id}>
            <input
              type="radio"
              name="tsp-target"
              value={team.id}
              data-testid={`tsp-target-${team.id}`}
              checked={targetId === team.id}
              onChange={() => {
                setTargetId(team.id)
                setError(null)
              }}
            />
            <span>
              {team.name} ({teamScoreFor(game, team.id)})
            </span>
          </label>
        ))}
      </fieldset>

      <p className="tsp__context" data-testid="tsp-context" aria-live="polite">
        {liveTile === null
          ? 'No tile is open. Reveal a prompt to award or deduct its value; a manual correction is always available.'
          : `Open tile: ${liveTile.categoryTitle}, worth ${liveTile.effectiveValue} points.`}
      </p>

      {target === null ? (
        <p className="host__note" data-testid="tsp-no-target">
          Choose a scoring target above to enable the scoring actions.
        </p>
      ) : (
        <p className="tsp__selected-team" data-testid="tsp-selected-team">
          Selected: <strong>{target.name}</strong> — currently {targetScore} points.
        </p>
      )}

      {liveTile !== null && (
        <div className="tsp__actions" role="group" aria-label="Tile scoring actions">
          <TilePresetButton
            testId="tsp-award-full"
            label={`Award full value (${formatSignedDelta(fullCreditDelta(liveTile.effectiveValue))})`}
            team={target}
            delta={fullCreditDelta(liveTile.effectiveValue)}
            mode="full-credit"
            disabled={
              !active ||
              target === null ||
              liveTile.effectiveValue === 0 ||
              alreadySubmitted(target?.id ?? '', liveTile.tileId, 'full-credit')
            }
            resultingScore={targetScore === null ? null : targetScore + liveTile.effectiveValue}
            onApply={() => applyTilePreset('full-credit', fullCreditDelta(liveTile.effectiveValue))}
          />
          <TilePresetButton
            testId="tsp-deduct-full"
            label={`Deduct full value (${formatSignedDelta(fullDeductionDelta(liveTile.effectiveValue))})`}
            team={target}
            delta={fullDeductionDelta(liveTile.effectiveValue)}
            mode="deduction"
            disabled={
              !active ||
              target === null ||
              liveTile.effectiveValue === 0 ||
              alreadySubmitted(target?.id ?? '', liveTile.tileId, 'deduction')
            }
            resultingScore={targetScore === null ? null : targetScore - liveTile.effectiveValue}
            onApply={() => applyTilePreset('deduction', fullDeductionDelta(liveTile.effectiveValue))}
          />
        </div>
      )}

      {liveTile !== null && (
        <div className="tsp__field">
          <label className="tsp__label" htmlFor="tsp-partial">
            Partial credit for this tile (whole points, up to {liveTile.effectiveValue})
          </label>
          <div className="tsp__row">
            <input
              id="tsp-partial"
              className="tsp__input"
              data-testid="tsp-partial-input"
              type="number"
              inputMode="numeric"
              step={1}
              value={partialText}
              placeholder={String(suggestedPartialCredit(liveTile.effectiveValue))}
              aria-describedby={error === null ? undefined : 'tsp-error'}
              onChange={(event) => {
                setPartialText(event.target.value)
                setError(null)
              }}
            />
            <button
              type="button"
              className="btn"
              data-testid="tsp-apply-partial"
              disabled={!active || target === null}
              aria-label={
                target === null
                  ? 'Apply partial credit'
                  : `Apply partial credit of ${partialText || '0'} points to ${target.name}`
              }
              onClick={applyPartialCredit}
            >
              Apply partial credit
            </button>
          </div>
          {target !== null && partialAmount !== null && targetScore !== null && (
            <p className="tsp__preview" data-testid="tsp-partial-preview">
              {target.name}: {targetScore} → {targetScore + partialAmount}
            </p>
          )}
        </div>
      )}

      <div className="tsp__field">
        <label className="tsp__label" htmlFor="tsp-manual">
          Manual correction (whole points, may be negative)
        </label>
        <div className="tsp__row">
          <input
            id="tsp-manual"
            className="tsp__input"
            data-testid="tsp-manual-input"
            type="number"
            inputMode="numeric"
            step={1}
            value={manualText}
            placeholder="e.g. 25 or -50"
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : 'tsp-error'}
            onChange={(event) => {
              setManualText(event.target.value)
              setError(null)
            }}
          />
          <button
            type="button"
            className="btn"
            data-testid="tsp-apply-manual"
            disabled={!active || target === null}
            aria-label={
              target === null
                ? 'Apply manual correction'
                : `Apply manual correction of ${manualText || '0'} points to ${target.name}`
            }
            onClick={applyManualCorrection}
          >
            Apply manual correction
          </button>
        </div>
        {manualNeedsConfirmation && (
          <label className="tsp__confirm" data-testid="tsp-confirm-label">
            <input
              type="checkbox"
              data-testid="tsp-confirm"
              checked={manualConfirmed}
              onChange={(event) => setManualConfirmed(event.target.checked)}
            />
            <span>
              Confirm this {manualAmount !== null && manualAmount < 0 ? 'negative' : 'large'}{' '}
              adjustment of {manualAmount === null ? '' : formatSignedDelta(manualAmount)} points
            </span>
          </label>
        )}
        {target !== null && manualAmount !== null && targetScore !== null && (
          <p className="tsp__preview" data-testid="tsp-manual-preview">
            {target.name}: {targetScore} → {targetScore + manualAmount}
          </p>
        )}
      </div>

      {error !== null && (
        <p className="tsp__error" id="tsp-error" role="alert" data-testid="tsp-error">
          {error}
        </p>
      )}

      <div className="tsp__history">
        <p className="tsp__last" data-testid="tsp-last-change" aria-live="polite">
          {lastChange === null
            ? 'No score change yet.'
            : `Last score change: ${nameOf(teams, lastChange.teamId)} ${formatSignedDelta(
                lastChange.delta,
              )} (${SCORE_ADJUSTMENT_MODE_LABEL[lastChange.mode]}).`}
        </p>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="tsp-undo-score"
          disabled={!canUndoScore}
          onClick={() => dispatch({ type: 'UNDO', issuedAt: clock.now() })}
        >
          Undo last score change
        </button>
        <p className="host__note">
          {canUndoScore
            ? 'Undo removes the score change exactly. It does not un-reveal an answer or return a tile to the board.'
            : 'The next undo would affect something other than a score, so it is disabled here. To fix an older score, apply a manual correction — history is never rewritten.'}
        </p>
      </div>
    </section>
  )
}

/** Resolve a team's display name for host copy; falls back to the raw id. */
function nameOf(teams: readonly TeamDefinition[], teamId: string): string {
  return teams.find((team) => team.id === teamId)?.name ?? teamId
}

/**
 * One tile preset. The accessible name always states the team AND the amount, so
 * a screen-reader user is never asked to infer either from surrounding layout.
 */
function TilePresetButton({
  testId,
  label,
  team,
  delta,
  mode,
  disabled,
  resultingScore,
  onApply,
}: {
  readonly testId: string
  readonly label: string
  readonly team: TeamDefinition | null
  readonly delta: number
  readonly mode: ScoreAdjustmentMode
  readonly disabled: boolean
  readonly resultingScore: number | null
  readonly onApply: () => void
}) {
  const amount = formatSignedDelta(delta)
  const accessibleName =
    team === null
      ? `${SCORE_ADJUSTMENT_MODE_LABEL[mode]}, ${amount} points`
      : `${SCORE_ADJUSTMENT_MODE_LABEL[mode]}, ${amount} points, to ${team.name}${
          resultingScore === null ? '' : `, giving ${resultingScore}`
        }`
  return (
    <button
      type="button"
      className="btn"
      data-testid={testId}
      disabled={disabled}
      aria-label={accessibleName}
      onClick={onApply}
    >
      {label}
      {resultingScore !== null && (
        <span className="tsp__result" data-testid={`${testId}-result`}>
          → {resultingScore}
        </span>
      )}
    </button>
  )
}
