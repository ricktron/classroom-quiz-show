/**
 * Pure display-only presentation selector (Slice 18).
 *
 * Input is sanitized `PublicState` only. Output is serializable display
 * classifications — never React elements, never private state, never a store.
 *
 * Derives scene, Nexus Core status, score layout, Signal Rail mode, living-board
 * depletion from currently visible board tiles, and unique-leader / tied Final
 * presentation. It does not reconstruct a semantic board after the public DTO
 * leaves the `board` stage, and it never ranks teams by score.
 */

import {
  PUBLIC_BOARD_KIND,
  PUBLIC_FINAL_KIND,
  type PublicBuzzState,
  type PublicCategoryBoardState,
  type PublicFinalOutcome,
  type PublicFinalWagerState,
  type PublicGameView,
  type PublicResponseState,
  type PublicState,
  type PublicTeam,
  type PublicTeamsState,
} from '../../state/publicState'

/** High-level projector scene classification. */
export type AudienceScene =
  | 'fail-closed'
  | 'waiting'
  | 'ready'
  | 'board'
  | 'quiet-cognition'
  | 'answer'
  | 'final'
  | 'unavailable'
  | 'complete'
  | 'neutral'

/** Adaptive score region mode selected from public team count alone. */
export type ScoreLayoutMode = 'none' | 'column' | 'strip' | 'deck'

/** Signal Rail mode. Exactly one is active at a time. */
export type SignalRailMode = 'compact' | 'expanded' | 'final' | 'hidden'

/** Presentation-only emphasis hint. Never gates game authority. */
export type AudienceEmphasis =
  | 'none'
  | 'selection'
  | 'prompt'
  | 'answer'
  | 'response'
  | 'category-clear'
  | 'final-reveal'
  | 'final-settle'
  | 'unique-leader'
  | 'tied'

/** What occupies the primary scene region. */
export type PrimaryContent = 'status' | 'board' | 'selection' | 'final' | 'decorative'

export interface NexusCorePresentation {
  /** Persistent product identity. */
  readonly brand: 'Classroom Quiz Show'
  /** Public-safe round ordinal line, or null when none applies. */
  readonly roundLabel: string | null
  /** Short stage / status label answering "where are we right now?". */
  readonly stageLabel: string
  /** Optional secondary public-safe line. */
  readonly detail: string | null
}

export interface BoardDepletion {
  readonly usedTiles: number
  readonly totalTiles: number
  /** Category keys where every currently visible tile is used. */
  readonly clearedCategoryKeys: readonly string[]
  /** True when every currently visible tile is used. */
  readonly boardCleared: boolean
}

export interface FinalResultPresentation {
  readonly outcome: PublicFinalOutcome
  /**
   * Positional key of the unique public score maximum, or null when the public
   * outcome is unique-leader but scores are absent / tied / inconsistent.
   */
  readonly leaderTeamKey: string | null
  readonly leaderTeamName: string | null
}

export interface AudiencePresentation {
  readonly scene: AudienceScene
  readonly nexus: NexusCorePresentation
  readonly scoreLayout: ScoreLayoutMode
  readonly signalRail: SignalRailMode
  readonly activeTeamName: string | null
  readonly waitingCount: number | null
  readonly boardDepletion: BoardDepletion | null
  readonly finalResult: FinalResultPresentation | null
  readonly emphasis: AudienceEmphasis
  readonly primaryContent: PrimaryContent
  /** True only for quiet-cognition scenes that must not show semantic board. */
  readonly showDecorativeLattice: boolean
  /** Authored public team order preserved (never score-sorted). */
  readonly teamsInAuthoredOrder: readonly PublicTeam[] | null
}

const BRAND = 'Classroom Quiz Show' as const

function teamNameFor(teams: PublicTeamsState | null, key: string): string | null {
  if (!teams || teams.status !== 'available') return null
  return teams.teams.find((team) => team.key === key)?.name ?? null
}

function teamsList(teams: PublicTeamsState | null): readonly PublicTeam[] | null {
  if (!teams || teams.status !== 'available' || teams.teams.length === 0) return null
  return teams.teams
}

/** Score layout from public team count. Never ranks. */
export function selectScoreLayoutMode(teamCount: number): ScoreLayoutMode {
  if (teamCount <= 0) return 'none'
  if (teamCount <= 4) return 'column'
  if (teamCount <= 6) return 'strip'
  return 'deck'
}

function deriveBoardDepletion(
  round: PublicCategoryBoardState,
): BoardDepletion | null {
  if (round.stage !== 'board') return null
  let usedTiles = 0
  let totalTiles = 0
  const clearedCategoryKeys: string[] = []
  for (const category of round.categories) {
    const tiles = category.tiles
    totalTiles += tiles.length
    let usedInCategory = 0
    for (const tile of tiles) {
      if (tile.used) {
        usedTiles += 1
        usedInCategory += 1
      }
    }
    if (tiles.length > 0 && usedInCategory === tiles.length) {
      clearedCategoryKeys.push(category.key)
    }
  }
  return {
    usedTiles,
    totalTiles,
    clearedCategoryKeys,
    boardCleared: totalTiles > 0 && usedTiles === totalTiles,
  }
}

/**
 * Unique-leader visual emphasis from currently public scores only.
 * Requires a single score maximum; otherwise returns null leader fields.
 */
export function selectUniqueLeader(
  outcome: PublicFinalOutcome,
  teams: PublicTeamsState | null,
): FinalResultPresentation {
  if (outcome === 'tied') {
    return { outcome: 'tied', leaderTeamKey: null, leaderTeamName: null }
  }
  const list = teamsList(teams)
  if (!list) {
    return { outcome: 'unique-leader', leaderTeamKey: null, leaderTeamName: null }
  }
  let max = -Infinity
  let leader: PublicTeam | null = null
  let tieForMax = false
  for (const team of list) {
    if (team.score > max) {
      max = team.score
      leader = team
      tieForMax = false
    } else if (team.score === max) {
      tieForMax = true
    }
  }
  if (!leader || tieForMax) {
    return { outcome: 'unique-leader', leaderTeamKey: null, leaderTeamName: null }
  }
  return {
    outcome: 'unique-leader',
    leaderTeamKey: leader.key,
    leaderTeamName: leader.name,
  }
}

function describeGameRound(game: PublicGameView | null): string | null {
  if (!game) return null
  if (game.status === 'ended') return 'Game complete'
  if (game.roundAvailability === 'unavailable') return 'Round unavailable'
  if (game.currentRound === null) {
    if (game.roundCount === 0) return null
    return `${game.roundCount} rounds`
  }
  return `Round ${game.currentRound} of ${game.roundCount}`
}

function boardStageLabel(stage: PublicCategoryBoardState['stage']): string {
  switch (stage) {
    case 'board':
      return 'Board open'
    case 'selected':
      return 'Selected'
    case 'prompt':
      return 'Question'
    case 'answer':
      return 'Answer'
    default: {
      const _exhaustive: never = stage
      return _exhaustive
    }
  }
}

function finalStageLabel(stage: PublicFinalWagerState['stage']): string {
  switch (stage) {
    case 'setup':
      return 'Final ready'
    case 'wager-entry':
      return 'Final wager'
    case 'wagers-locked':
      return 'Wagers locked'
    case 'response-entry':
      return 'Final response'
    case 'responses-locked':
      return 'Responses locked'
    case 'answer-revealed':
      return 'Final answer'
    case 'team-reveal':
      return 'Team reveal'
    case 'resolution':
      return 'Final settlement'
    case 'sudden-death':
      return 'Sudden death'
    case 'complete':
      return 'Game complete'
    default: {
      const _exhaustive: never = stage
      return _exhaustive
    }
  }
}

function responseActiveTeam(
  response: PublicResponseState | null,
  teams: PublicTeamsState | null,
): { activeTeamName: string | null; waitingCount: number | null } {
  if (!response) return { activeTeamName: null, waitingCount: null }
  const buzz: PublicBuzzState = response.buzz
  switch (buzz.status) {
    case 'none':
      return { activeTeamName: null, waitingCount: null }
    case 'exhausted':
      return { activeTeamName: null, waitingCount: 0 }
    case 'active':
      return {
        activeTeamName: teamNameFor(teams, buzz.activeTeamKey),
        waitingCount: buzz.waitingCount,
      }
    default: {
      const _exhaustive: never = buzz
      return _exhaustive
    }
  }
}

function selectSignalRail(
  round: PublicState['round'],
  response: PublicResponseState | null,
): SignalRailMode {
  if (round?.kind === PUBLIC_FINAL_KIND) return 'final'
  if (response && response.buzz.status === 'active') return 'expanded'
  if (response) return 'compact'
  if (round?.kind === PUBLIC_BOARD_KIND && round.stage === 'board') return 'compact'
  return 'compact'
}

function selectEmphasis(
  scene: AudienceScene,
  round: PublicState['round'],
  response: PublicResponseState | null,
  depletion: BoardDepletion | null,
  finalResult: FinalResultPresentation | null,
): AudienceEmphasis {
  if (round?.kind === PUBLIC_FINAL_KIND) {
    switch (round.stage) {
      case 'team-reveal':
        return 'final-reveal'
      case 'resolution':
        return finalResult?.outcome === 'tied' ? 'tied' : 'final-settle'
      case 'complete':
        return finalResult?.outcome === 'tied' ? 'tied' : 'unique-leader'
      default:
        return 'none'
    }
  }
  if (round?.kind === PUBLIC_BOARD_KIND) {
    if (round.stage === 'selected') return 'selection'
    if (round.stage === 'prompt') return 'prompt'
    if (round.stage === 'answer') return 'answer'
    if (
      round.stage === 'board' &&
      depletion &&
      (depletion.clearedCategoryKeys.length > 0 || depletion.boardCleared)
    ) {
      return 'category-clear'
    }
  }
  if (response?.buzz.status === 'active') return 'response'
  if (scene === 'complete' && finalResult?.outcome === 'tied') return 'tied'
  if (scene === 'complete' && finalResult?.outcome === 'unique-leader') {
    return 'unique-leader'
  }
  return 'none'
}

function nexusFor(
  stageLabel: string,
  game: PublicGameView | null,
  detail: string | null,
): NexusCorePresentation {
  return {
    brand: BRAND,
    roundLabel: describeGameRound(game),
    stageLabel,
    detail,
  }
}

/**
 * Deterministic presentation selection from sanitized public DTOs only.
 */
export function selectAudiencePresentation(state: PublicState): AudiencePresentation {
  const teams = teamsList(state.teams)
  const scoreLayout = selectScoreLayoutMode(teams?.length ?? 0)
  const { activeTeamName, waitingCount } = responseActiveTeam(state.response, state.teams)

  // Fail-closed / unavailable top-level shapes.
  if (state.game?.roundAvailability === 'unavailable') {
    return {
      scene: 'unavailable',
      nexus: nexusFor('This round is not available yet', state.game, state.detail),
      scoreLayout,
      signalRail: 'compact',
      activeTeamName,
      waitingCount,
      boardDepletion: null,
      finalResult: null,
      emphasis: 'none',
      primaryContent: 'status',
      showDecorativeLattice: false,
      teamsInAuthoredOrder: teams,
    }
  }

  if (state.teams?.status === 'unavailable') {
    // Scores unavailable is still a valid public state; continue with layout none.
  }

  const scoreLayoutResolved =
    state.teams === null
      ? 'none'
      : state.teams.status === 'unavailable'
        ? 'none'
        : scoreLayout

  if (state.game?.status === 'ended' && state.round === null) {
    return {
      scene: 'complete',
      nexus: nexusFor('Game complete', state.game, state.detail),
      scoreLayout: scoreLayoutResolved,
      signalRail: 'compact',
      activeTeamName: null,
      waitingCount: null,
      boardDepletion: null,
      finalResult: null,
      emphasis: 'none',
      primaryContent: 'status',
      showDecorativeLattice: false,
      teamsInAuthoredOrder: teams,
    }
  }

  if (state.round?.kind === PUBLIC_BOARD_KIND) {
    return presentBoard(state, state.round, scoreLayoutResolved, teams, activeTeamName, waitingCount)
  }

  if (state.round?.kind === PUBLIC_FINAL_KIND) {
    return presentFinal(state, state.round, scoreLayoutResolved, teams, activeTeamName)
  }

  // No round on screen.
  if (state.phase === 'no-session') {
    return {
      scene: 'waiting',
      nexus: nexusFor('Display waiting', state.game, state.detail),
      scoreLayout: scoreLayoutResolved,
      signalRail: 'hidden',
      activeTeamName: null,
      waitingCount: null,
      boardDepletion: null,
      finalResult: null,
      emphasis: 'none',
      primaryContent: 'status',
      showDecorativeLattice: false,
      teamsInAuthoredOrder: teams,
    }
  }

  if (state.phase === 'ready') {
    return {
      scene: 'ready',
      nexus: nexusFor('Ready', state.game, state.detail),
      scoreLayout: scoreLayoutResolved,
      signalRail: 'compact',
      activeTeamName: null,
      waitingCount: null,
      boardDepletion: null,
      finalResult: null,
      emphasis: 'none',
      primaryContent: 'status',
      showDecorativeLattice: false,
      teamsInAuthoredOrder: teams,
    }
  }

  if (state.phase === 'waiting') {
    return {
      scene: 'waiting',
      nexus: nexusFor('Display waiting', state.game, state.detail),
      scoreLayout: scoreLayoutResolved,
      signalRail: 'compact',
      activeTeamName: null,
      waitingCount: null,
      boardDepletion: null,
      finalResult: null,
      emphasis: 'none',
      primaryContent: 'status',
      showDecorativeLattice: false,
      teamsInAuthoredOrder: teams,
    }
  }

  // Defensive neutral scene for any unexpected combination.
  return {
    scene: 'neutral',
    nexus: nexusFor(state.headline || 'Display waiting', state.game, state.detail),
    scoreLayout: scoreLayoutResolved,
    signalRail: selectSignalRail(state.round, state.response),
    activeTeamName,
    waitingCount,
    boardDepletion: null,
    finalResult: null,
    emphasis: 'none',
    primaryContent: 'status',
    showDecorativeLattice: false,
    teamsInAuthoredOrder: teams,
  }
}

function presentBoard(
  state: PublicState,
  round: PublicCategoryBoardState,
  scoreLayout: ScoreLayoutMode,
  teams: readonly PublicTeam[] | null,
  activeTeamName: string | null,
  waitingCount: number | null,
): AudiencePresentation {
  const boardDepletion = deriveBoardDepletion(round)
  const signalRail = selectSignalRail(round, state.response)

  switch (round.stage) {
    case 'board': {
      const scene: AudienceScene = 'board'
      const emphasis = selectEmphasis(scene, round, state.response, boardDepletion, null)
      return {
        scene,
        nexus: nexusFor(boardStageLabel('board'), state.game, state.detail),
        scoreLayout,
        signalRail,
        activeTeamName,
        waitingCount,
        boardDepletion,
        finalResult: null,
        emphasis,
        primaryContent: 'board',
        showDecorativeLattice: false,
        teamsInAuthoredOrder: teams,
      }
    }
    case 'selected':
    case 'prompt': {
      const scene: AudienceScene = 'quiet-cognition'
      return {
        scene,
        nexus: nexusFor(boardStageLabel(round.stage), state.game, state.detail),
        scoreLayout,
        signalRail,
        activeTeamName,
        waitingCount,
        boardDepletion: null,
        finalResult: null,
        emphasis: selectEmphasis(scene, round, state.response, null, null),
        primaryContent: 'selection',
        showDecorativeLattice: true,
        teamsInAuthoredOrder: teams,
      }
    }
    case 'answer': {
      const scene: AudienceScene = 'answer'
      return {
        scene,
        nexus: nexusFor(boardStageLabel('answer'), state.game, state.detail),
        scoreLayout,
        signalRail,
        activeTeamName,
        waitingCount,
        boardDepletion: null,
        finalResult: null,
        emphasis: 'answer',
        primaryContent: 'selection',
        showDecorativeLattice: true,
        teamsInAuthoredOrder: teams,
      }
    }
  }
}

function presentFinal(
  state: PublicState,
  round: PublicFinalWagerState,
  scoreLayout: ScoreLayoutMode,
  teams: readonly PublicTeam[] | null,
  activeTeamName: string | null,
): AudiencePresentation {
  let finalResult: FinalResultPresentation | null = null
  if (round.stage === 'resolution' || round.stage === 'complete') {
    finalResult = selectUniqueLeader(round.outcome, state.teams)
  }

  const scene: AudienceScene =
    round.stage === 'complete' ? 'complete' : 'final'

  return {
    scene,
    nexus: nexusFor(finalStageLabel(round.stage), state.game, state.detail),
    scoreLayout,
    signalRail: 'final',
    activeTeamName:
      round.stage === 'team-reveal'
        ? teamNameFor(state.teams, round.reveal.teamKey)
        : activeTeamName,
    waitingCount: null,
    boardDepletion: null,
    finalResult,
    emphasis: selectEmphasis(scene, round, state.response, null, finalResult),
    primaryContent: 'final',
    showDecorativeLattice: false,
    teamsInAuthoredOrder: teams,
  }
}
