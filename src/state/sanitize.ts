import type {
  CategoryBoardRoundState,
  PrivateGameState,
  PrivateState,
} from './privateState'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_BOARD_KIND,
  PUBLIC_STATE_SCHEMA_VERSION,
  isPublicState,
  type PublicCategoryBoardCategory,
  type PublicCategoryBoardTile,
  type PublicBuzzState,
  type PublicGameView,
  type PublicPhase,
  type PublicPromptContent,
  type PublicResponseState,
  type PublicResponseTimer,
  type PublicRoundAvailability,
  type PublicRoundState,
  type PublicState,
  type PublicTeam,
  type PublicTeamsState,
} from './publicState'
import { PUBLIC_STATUS_COPY, PUBLIC_STATUS_PHASE } from './status'
import { categoryBoardStateFor, responsePhaseFor, teamScoreFor } from './reducer'
import { isInitialResponsePhase } from '../game/timing/responsePhase'
import { buzzQueueStatus, type BuzzQueueState } from '../game/timing/buzzQueue'
import { isTeamAccent } from '../game/teams/accents'
import { teamIndexById } from '../game/teams/definition'
import { isTeamScore } from '../game/teams/scoring'
import {
  findTileLocation,
  readCategoryBoardDefinition,
  type CategoryBoardDefinition,
} from '../game/categoryBoard/definition'
import {
  assertNeverPromptKind,
  readTrustedPrompt,
  type PromptContent,
} from '../game/media/definition'
import type { RoundDefinition } from '../game/roundDefinition'

/**
 * Project the private game session to the tiny, safe public game view.
 *
 * Like the parent sanitizer this is ALLOW-LIST based: it names only counts, a
 * 1-based ordinal, a coarse status, and a neutral availability. It NEVER reads
 * the definition's title, round ids, round types, round titles, or config — so
 * authored content (and any future answers/notes) cannot leak through it. An
 * unsupported current round projects to `roundAvailability: 'unavailable'`
 * (fail closed) and exposes nothing about the unsupported type.
 */
function roundAvailabilityOf(
  game: PrivateGameState,
  projectionFailed: boolean,
): PublicRoundAvailability {
  if (game.gameLifecycle === 'ended' || game.currentRoundIndex === null) return 'none'
  if (game.currentRoundSupport === 'unsupported') return 'unavailable'
  // A round whose type IS playable but whose public projection could not be
  // built is not "available": it fails closed to the same neutral state as an
  // unregistered type, and says nothing about why.
  if (projectionFailed) return 'unavailable'
  return 'available'
}

function toPublicGameView(
  game: PrivateGameState | null,
  projectionFailed: boolean,
): PublicGameView | null {
  if (!game) return null

  return {
    status: game.gameLifecycle === 'ended' ? 'ended' : 'active',
    roundCount: game.definition.rounds.length,
    currentRound: game.currentRoundIndex === null ? null : game.currentRoundIndex + 1,
    roundAvailability: roundAvailabilityOf(game, projectionFailed),
  }
}

/** The current round definition, or `null` when no round is selected. */
function currentRoundOf(game: PrivateGameState): RoundDefinition | null {
  if (game.currentRoundIndex === null) return null
  return game.definition.rounds[game.currentRoundIndex] ?? null
}

/**
 * Project trusted prompt content to the allow-listed public DTO.
 *
 * Every field is NAMED and copied individually — nothing is spread — so a
 * future media kind added to the private model is NOT exposed by default.
 * Impossible / unrecognized private media returns `null` so the round fails
 * closed to unavailable rather than fabricating clue content.
 */
function toPublicPromptContent(prompt: PromptContent): PublicPromptContent | null {
  const trusted = readTrustedPrompt(prompt)
  if (trusted === null) return null

  switch (trusted.kind) {
    case 'text':
      return { kind: 'text', text: trusted.text }
    case 'image':
      return {
        kind: 'image',
        source: { kind: 'same-origin-path', path: trusted.source.path },
        alt: trusted.alt,
        caption: trusted.caption,
        attribution: trusted.attribution,
      }
    default:
      return assertNeverPromptKind(trusted)
  }
}

/**
 * Project one category-board round to its public DTO.
 *
 * This is the gameplay half of the private→public boundary, and it is
 * ALLOW-LIST based in exactly the same way as its parent: every public field is
 * NAMED and copied individually from the trusted board. Nothing is spread,
 * cloned-and-deleted, or serialized, so a field added to `CategoryBoardTile`
 * later (a media reference, a standards tag, a hidden bonus marker) is NOT
 * exposed by default.
 *
 * What it deliberately never reads:
 *  - `tile.notes` — host-only teacher notes, at EVERY stage;
 *  - `tile.alternates` — a host grading aid, at EVERY stage;
 *  - the `prompt`/`answer` of any tile other than the selected one;
 *  - the selected tile's `prompt` before the prompt reveal, or its `answer`
 *    before the answer reveal;
 *  - authored category/tile ids — the projector gets positional keys instead.
 *
 * Returns `null` when there is nothing safe to publish (an impossible private
 * state, e.g. a selected tile id that is not on the board, or malformed media).
 * The caller turns that into the neutral "unavailable" projection.
 */
function toPublicCategoryBoardState(
  board: CategoryBoardDefinition,
  boardState: CategoryBoardRoundState,
): PublicRoundState | null {
  const progress = boardState.progress

  if (progress.stage === 'board') {
    const used = new Set(boardState.usedTileIds)
    const categories: PublicCategoryBoardCategory[] = board.categories.map(
      (category, categoryIndex) => {
        const tiles: PublicCategoryBoardTile[] = category.tiles.map((tile, tileIndex) => ({
          // Positional, opaque, deterministic — never the authored tile id.
          key: `c${categoryIndex}t${tileIndex}`,
          value: tile.effectiveValue,
          used: used.has(tile.id),
        }))
        return { key: `c${categoryIndex}`, title: category.title, tiles }
      },
    )
    return { kind: PUBLIC_BOARD_KIND, stage: 'board', categories }
  }

  const location = findTileLocation(board, progress.selectedTileId)
  // Impossible private state (a selection that is not on this board) → fail closed.
  if (location === null) return null

  let publicPrompt: PublicPromptContent | null = null
  if (progress.stage === 'prompt' || progress.stage === 'answer') {
    // The prompt becomes public only from the prompt stage on. Before that the
    // content is not sent at all — there is no hidden field to inspect.
    publicPrompt = toPublicPromptContent(location.tile.prompt)
    // Malformed trusted media at a reveal stage → unavailable, never a guess.
    if (publicPrompt === null) return null
  }

  return {
    kind: PUBLIC_BOARD_KIND,
    stage: progress.stage,
    selection: {
      categoryTitle: location.category.title,
      value: location.tile.effectiveValue,
      prompt: publicPrompt,
      // The answer becomes public only after an explicit answer reveal
      // (GAME-ENGINE-BOUNDARIES §4). `alternates` and `notes` are never read.
      answer: progress.stage === 'answer' ? location.tile.answer : null,
    },
  }
}

/**
 * Project the session's teams and scores to the public scoreboard (Slice 6).
 *
 * ALLOW-LIST, exactly like its siblings: every public field is NAMED and copied
 * individually. Nothing is spread, cloned-and-deleted, or serialized, so a field
 * added to `TeamDefinition` later (a roster, a device token, a private note) is
 * NOT exposed by default.
 *
 * What it deliberately never reads:
 *  - the authored team `id` — the projector gets a positional key instead;
 *  - the private per-event score history, or any undo metadata;
 *  - the host's selected scoring target (which is not in session state at all);
 *  - `order`, except as the array position it already implies.
 *
 * Returns `null` when the game configures no teams (no scoreboard exists), and
 * the explicit `unavailable` state when a team's data cannot be safely projected —
 * so a corrupt score becomes a visible neutral panel rather than `NaN` at the
 * front of a classroom.
 *
 * Scores are still projected after the game ENDS: final results are exactly what
 * a class wants on screen at that point.
 */
function toPublicTeams(game: PrivateGameState | null): PublicTeamsState | null {
  if (!game) return null
  const teams = game.definition.teams
  if (teams.length === 0) return null

  const projected: PublicTeam[] = []
  for (let index = 0; index < teams.length; index += 1) {
    const team = teams[index]
    const score = teamScoreFor(game, team.id)
    // Fail closed on anything the projector should not be asked to render.
    if (typeof team.name !== 'string' || !isTeamAccent(team.accent) || !isTeamScore(score)) {
      return { status: 'unavailable' }
    }
    projected.push({
      // Positional, opaque, deterministic — never the authored team id.
      key: `t${index}`,
      name: team.name,
      accent: team.accent,
      score,
    })
  }
  return { status: 'available', teams: projected }
}

/**
 * Project the live clue's response phase to the public DTO (Slice 7).
 *
 * ALLOW-LIST, exactly like its siblings: every public field is NAMED and copied
 * individually from the durable phase. Nothing is spread or serialized, so a
 * field added to `ResponseTimerState` later is NOT exposed by default.
 *
 * What it deliberately never reads:
 *  - `timerId` — an internal token the projector has no use for;
 *  - the interruption `source` — "stopped" is public, *why* is not. Slice 8 keeps
 *    this exactly: a buzz-interrupted window still publishes only "stopped", and
 *    who is answering arrives through the separate buzz projection below, which
 *    is a deliberate decision rather than something inherited from the timer;
 *  - a running timer's `startedAt` — the deadline is the fact the display needs,
 *    and publishing both would invite the display to recompute the window;
 *  - the private per-round phase map, or any other round's phase;
 *  - the queue's raw `order` array, its authored team ids, its `resolvedCount`,
 *    and every team that has already had a turn.
 *
 * It is PURE: it reads no clock. A running timer is projected as its absolute
 * deadline, and "how long is left" is derived by the display against its own
 * clock at render time — which is the whole reason there is no tick stream.
 *
 * Returns `null` when there is nothing to show, including when the phase is
 * untouched: a clue that was never armed and never timed publishes no timer panel
 * at all rather than an empty one.
 */
function toPublicResponse(game: PrivateGameState | null): PublicResponseState | null {
  if (!game || game.gameLifecycle !== 'active') return null
  const current = currentRoundOf(game)
  if (!current) return null
  // Only a round with a public presentation may carry a public response phase.
  if (readCategoryBoardDefinition(current) === null) return null

  const phase = responsePhaseFor(game, current.id)
  if (isInitialResponsePhase(phase)) return null

  const timer = phase.timer
  let publicTimer: PublicResponseTimer
  switch (timer.status) {
    case 'running':
      publicTimer = {
        status: 'running',
        durationMs: timer.durationMs,
        deadline: timer.deadline,
      }
      break
    case 'paused':
      publicTimer = {
        status: 'paused',
        durationMs: timer.durationMs,
        remainingMs: timer.remainingMs,
      }
      break
    case 'expired':
      publicTimer = { status: 'expired', durationMs: timer.durationMs }
      break
    case 'interrupted':
      publicTimer = {
        status: 'interrupted',
        durationMs: timer.durationMs,
        remainingMs: timer.remainingMs,
      }
      break
    case 'idle':
    default:
      publicTimer = { status: 'idle' }
      break
  }

  return { armed: phase.armed, timer: publicTimer, buzz: toPublicBuzz(game, phase.queue) }
}

/**
 * Project the ordered buzz queue to the tiny public DTO (Slice 8).
 *
 * ALLOW-LIST, like every sibling: it names a positional key and a count, and it
 * reads nothing else. The private queue is `{ order: TeamId[], resolvedCount }`;
 * what leaves is at most `{ status, activeTeamKey, waitingCount }`.
 *
 * What it deliberately never reads:
 *  - the authored team id of ANY queue member — the active team is named by the
 *    same positional key the scoreboard already publishes, so the display resolves
 *    the name from data it already has and no id ever travels;
 *  - the ORDER of the waiting teams, or their identities at all — only how many
 *    (see the DTO's header for why that decision was made);
 *  - the teams whose turn is already over;
 *  - `resolvedCount`, or anything from which it could be reconstructed;
 *  - the key, device, adapter or mapping that produced any buzz — none of which
 *    is reachable from here in the first place, because none of it is in the
 *    durable state.
 *
 * Fails closed: an active team id that is not on the loaded game (an impossible
 * private state) projects `none` rather than an unresolvable key.
 */
function toPublicBuzz(game: PrivateGameState, queue: BuzzQueueState): PublicBuzzState {
  const status = buzzQueueStatus(queue)
  if (status.status === 'empty') return { status: 'none' }
  if (status.status === 'exhausted') return { status: 'exhausted' }
  const index = teamIndexById(game.definition.teams, status.activeTeamId)
  if (index < 0) return { status: 'none' }
  return {
    status: 'active',
    // Positional, opaque, deterministic — never the authored team id, and exactly
    // the key `toPublicTeams` assigns, so the two cannot disagree.
    activeTeamKey: `t${index}`,
    waitingCount: status.waitingTeamIds.length,
  }
}

/** Outcome of projecting the current round: a DTO, nothing to show, or a failure. */
interface RoundProjection {
  readonly round: PublicRoundState | null
  readonly failed: boolean
}

function projectCurrentRound(game: PrivateGameState | null): RoundProjection {
  if (!game || game.gameLifecycle !== 'active') return { round: null, failed: false }
  const current = currentRoundOf(game)
  if (!current) return { round: null, failed: false }

  const board = readCategoryBoardDefinition(current)
  // Not a category board (e.g. the non-gameplay placeholder, or an unregistered
  // type). There is simply no round DTO — that is not a failure.
  if (board === null) return { round: null, failed: false }

  const projected = toPublicCategoryBoardState(board, categoryBoardStateFor(game, current.id))
  return { round: projected, failed: projected === null }
}

/**
 * The private → public boundary (permanent invariant — GAME-ENGINE-BOUNDARIES §4).
 *
 * This sanitizer is ALLOW-LIST based. It constructs a fresh `PublicState` by
 * naming each safe field explicitly. It deliberately does NOT:
 *   - clone the private state and delete fields,
 *   - spread any private object into the result,
 *   - serialize private state,
 *   - rely on a "private"-ish naming convention.
 *
 * Because the output object literal references only `revision`, the resolved
 * status copy, a coarse phase, and two separately allow-listed sub-projections,
 * a NEW private field added to `PrivateState` later cannot reach the display: it
 * simply is not mentioned here. That is the whole point of an allow-list — the
 * default for anything new is "not exposed".
 *
 * Public projection failure (the fourth failure category): if projection ever
 * throws or produces a structurally invalid result, `safeToPublicState` returns
 * the safe `INITIAL_PUBLIC_STATE` so callers still fail closed.
 */
export function toPublicState(state: PrivateState): PublicState {
  const session = state.session

  // No session yet → a fixed, safe "no host" projection.
  if (!session) {
    return {
      schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
      revision: state.revision,
      phase: 'no-session',
      headline: INITIAL_PUBLIC_STATE.headline,
      detail: INITIAL_PUBLIC_STATE.detail,
      game: null,
      round: null,
      teams: null,
      response: null,
    }
  }

  const copy = PUBLIC_STATUS_COPY[session.publicStatusCode]
  const phase: PublicPhase = PUBLIC_STATUS_PHASE[session.publicStatusCode]
  const projection = projectCurrentRound(session.game)

  // NOTE: sessionId, counter, hostNotes, diagnostics, the FULL game definition,
  // the private per-round board state, the raw team score map and the private
  // response-phase map (with its internal timer ids and interruption sources) are
  // intentionally not referenced. The game view, the round DTO, the scoreboard and
  // the response phase are separately allow-listed projections. Do not spread
  // `session`, `state`, `game`, or any board/tile/team/phase object here.
  return {
    schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
    revision: state.revision,
    phase,
    headline: copy.headline,
    detail: copy.detail,
    game: toPublicGameView(session.game, projection.failed),
    round: projection.round,
    teams: toPublicTeams(session.game),
    // A round whose public projection FAILED must not publish a timer either: the
    // display fails closed to the neutral "not available" panel, and a countdown
    // floating above it would contradict that.
    response: projection.failed ? null : toPublicResponse(session.game),
  }
}

/**
 * Defensive wrapper: guarantees a valid `PublicState` even if `toPublicState`
 * throws or (impossibly) returns something malformed. Used at the broadcast
 * boundary so a projection bug can never publish garbage or crash the host loop.
 */
export function safeToPublicState(state: PrivateState): PublicState {
  try {
    const projected = toPublicState(state)
    return isPublicState(projected) ? projected : INITIAL_PUBLIC_STATE
  } catch {
    return INITIAL_PUBLIC_STATE
  }
}
