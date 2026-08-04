import { deepFreeze } from '../game/deepFreeze'
import {
  allTiles,
  readCategoryBoardDefinition,
  type CategoryBoardDefinition,
} from '../game/categoryBoard/definition'
import type { FinalWagerRoundState } from '../game/finalWager/finalState'
import type { GameDefinition } from '../game/gameDefinition'
import type { TeamDefinition } from '../game/teams/definition'
import type { SessionEvent } from '../state/events'
import type { PrivateGameState, PrivateState } from '../state/privateState'
import {
  categoryBoardStateFor,
  effectiveEvents,
  finalWagerStateFor,
  replay,
  teamScoreFor,
} from '../state/reducer'
import {
  SESSION_SUMMARY_CONTRACT_KIND,
  SESSION_SUMMARY_CONTRACT_VERSION,
  type SessionSummaryBuzzActivityV1,
  type SessionSummaryCategoryBoardRoundV1,
  type SessionSummaryCategoryBoardSectionV1,
  type SessionSummaryFinalDerivedV1,
  type SessionSummaryFinalObservedV1,
  type SessionSummaryFinalResolutionPathV1,
  type SessionSummaryFinalSectionV1,
  type SessionSummaryResultV1,
  type SessionSummaryScoreActivityV1,
  type SessionSummaryStandingV1,
  type SessionSummaryTerminalPathV1,
  type SessionSummaryTimerActivityV1,
  type SessionSummaryV1,
} from './contract'

/**
 * Derive one deterministic host-private session summary from authoritative
 * event history alone.
 *
 * Public entrypoint for Slice 15. Internally uses `effectiveEvents` and
 * `replay`; never accepts separately supplied state; never reads React,
 * browser globals, clocks, locale, randomness, public state, persistence, or
 * network.
 */
export function deriveSessionSummaryV1(
  history: readonly SessionEvent[],
): SessionSummaryResultV1 {
  if (!Array.isArray(history)) {
    return { status: 'invalid-history', reason: 'history-not-array' }
  }

  // Freeze a shallow copy of references so callers cannot mutate through the
  // result path; events themselves are already treated as immutable facts.
  let state: PrivateState
  try {
    state = replay(history)
  } catch {
    return { status: 'invalid-history', reason: 'replay-failed' }
  }

  if (state.session === null) {
    return { status: 'no-session' }
  }
  if (state.session.game === null) {
    return { status: 'no-game' }
  }
  if (state.session.game.gameLifecycle !== 'ended') {
    return { status: 'active-or-incomplete' }
  }

  const effective = effectiveEvents(history)
  const endIndex = findLastIndex(effective, (event) => event.type === 'GAME_SESSION_ENDED')
  if (endIndex < 0) {
    return { status: 'invalid-history', reason: 'ended-without-game-session-ended' }
  }

  const sessionInit = effective.find((event) => event.type === 'SESSION_INITIALIZED')
  const gameInit = effective.find((event) => event.type === 'GAME_INITIALIZED')
  if (sessionInit === undefined || sessionInit.type !== 'SESSION_INITIALIZED') {
    return { status: 'invalid-history', reason: 'missing-session-initialized' }
  }
  if (gameInit === undefined || gameInit.type !== 'GAME_INITIALIZED') {
    return { status: 'invalid-history', reason: 'missing-game-initialized' }
  }

  const endEvent = effective[endIndex]
  if (endEvent.type !== 'GAME_SESSION_ENDED') {
    return { status: 'invalid-history', reason: 'missing-game-session-ended' }
  }

  const prefixBeforeEnd = effective.slice(0, endIndex)
  const stateBeforeEnd = replay(prefixBeforeEnd)
  const gameBeforeEnd = stateBeforeEnd.session?.game
  if (gameBeforeEnd === undefined || gameBeforeEnd === null) {
    return { status: 'invalid-history', reason: 'missing-game-before-end' }
  }

  const endedGame = state.session.game
  const definition = endedGame.definition
  const terminalPath = classifyTerminalPath(prefixBeforeEnd, gameBeforeEnd, definition)

  const summary: SessionSummaryV1 = {
    kind: SESSION_SUMMARY_CONTRACT_KIND,
    version: SESSION_SUMMARY_CONTRACT_VERSION,
    derivationBasis: {
      kind: 'effective-history-and-replay',
      effectiveEventCount: effective.length,
      historyEventCount: history.length,
    },
    sessionId: state.session.sessionId,
    gameId: definition.id,
    gameTitle: definition.title,
    recordedSessionStartAt: sessionInit.occurredAt,
    recordedCompletionAt: endEvent.occurredAt,
    terminalPath,
    scoreActivity: buildScoreActivity(effective, endedGame, definition.teams),
    timerActivity: buildTimerActivity(effective),
    buzzActivity: buildBuzzActivity(effective),
    categoryBoards: buildCategoryBoards(effective, endedGame, definition),
    finalWager: buildFinalSection(effective, gameBeforeEnd, endedGame, definition, terminalPath),
  }

  return deepFreeze({ status: 'available', summary })
}

function classifyTerminalPath(
  prefixBeforeEnd: readonly SessionEvent[],
  gameBeforeEnd: PrivateGameState,
  definition: GameDefinition,
): SessionSummaryTerminalPathV1 {
  const last = prefixBeforeEnd[prefixBeforeEnd.length - 1]
  if (
    last !== undefined &&
    last.type === 'FINAL_TIE_RESOLUTION_SELECTED' &&
    last.resolution === 'accepted-tie'
  ) {
    return 'final-accepted-tied-finish'
  }

  const finalRound = findFinalRound(definition)
  if (finalRound === null) return 'ordinary-or-host-ended'

  const final = finalWagerStateFor(gameBeforeEnd, finalRound.id)
  if (final.snapshot === null) return 'ordinary-or-host-ended'

  const leaders = uniqueLeaders(definition.teams, (teamId) => teamScoreFor(gameBeforeEnd, teamId))

  if (final.tieResolution === 'sudden-death') {
    // Host completed after sudden death (unique leader) while still in that phase,
    // or ended mid sudden-death. Only claim a sudden-death winner when the lead
    // is unique at the irreversible end.
    if (leaders.length === 1) return 'final-sudden-death-winner'
    return 'ordinary-or-host-ended'
  }

  if (final.phase === 'ready-to-complete' && leaders.length === 1) {
    return 'final-unique-winner'
  }

  // Zero-eligible Classic Final resolves on pre-final scores into ready-to-complete
  // or resolution; unique leader is still a Final unique-winner path.
  if (
    final.snapshot.teams.length === 0 &&
    (final.phase === 'ready-to-complete' || final.phase === 'resolution') &&
    leaders.length === 1
  ) {
    return 'final-unique-winner'
  }

  return 'ordinary-or-host-ended'
}

function buildScoreActivity(
  effective: readonly SessionEvent[],
  game: PrivateGameState,
  teams: readonly TeamDefinition[],
): SessionSummaryScoreActivityV1 {
  let scoreChangeCount = 0
  let tileLinkedAdjustmentCount = 0
  let manualAdjustmentCount = 0
  let finalSettlementCount = 0
  const perTeamCounts = new Map<string, { scoreChangeCount: number; netDelta: number }>()

  for (const team of teams) {
    perTeamCounts.set(team.id, { scoreChangeCount: 0, netDelta: 0 })
  }

  for (const event of effective) {
    if (event.type === 'TEAM_SCORE_ADJUSTED') {
      scoreChangeCount += 1
      if (event.source.kind === 'category-board-tile') tileLinkedAdjustmentCount += 1
      else manualAdjustmentCount += 1
      const row = perTeamCounts.get(event.teamId)
      if (row) {
        row.scoreChangeCount += 1
        row.netDelta += event.delta
      }
    } else if (event.type === 'FINAL_TEAM_SETTLED') {
      scoreChangeCount += 1
      finalSettlementCount += 1
      const row = perTeamCounts.get(event.teamId)
      if (row) {
        row.scoreChangeCount += 1
        row.netDelta += event.delta
      }
    }
  }

  const perTeam = teams.map((team) => {
    const row = perTeamCounts.get(team.id) ?? { scoreChangeCount: 0, netDelta: 0 }
    const finalScore = teamScoreFor(game, team.id)
    return {
      teamId: team.id,
      teamName: team.name,
      scoreChangeCount: row.scoreChangeCount,
      netDelta: row.netDelta,
      finalScore,
    }
  })

  return {
    observed: {
      scoreChangeCount,
      tileLinkedAdjustmentCount,
      manualAdjustmentCount,
      finalSettlementCount,
      perTeam,
    },
    derived: {
      standings: buildStandings(teams, game),
    },
  }
}

function buildStandings(
  teams: readonly TeamDefinition[],
  game: PrivateGameState,
): readonly SessionSummaryStandingV1[] {
  const scored = teams.map((team, authoredIndex) => ({
    teamId: team.id,
    teamName: team.name,
    finalScore: teamScoreFor(game, team.id),
    authoredIndex,
  }))

  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore
    return a.authoredIndex - b.authoredIndex
  })

  const standings: SessionSummaryStandingV1[] = []
  let index = 0
  while (index < scored.length) {
    const score = scored[index].finalScore
    let end = index + 1
    while (end < scored.length && scored[end].finalScore === score) end += 1
    const rank = index + 1
    const tied = end - index > 1
    for (let i = index; i < end; i += 1) {
      standings.push({
        rank,
        teamId: scored[i].teamId,
        teamName: scored[i].teamName,
        finalScore: scored[i].finalScore,
        tied,
      })
    }
    index = end
  }
  return standings
}

function buildTimerActivity(effective: readonly SessionEvent[]): SessionSummaryTimerActivityV1 {
  let starts = 0
  let pauses = 0
  let resumes = 0
  let expirations = 0
  let interruptions = 0
  let resets = 0

  for (const event of effective) {
    switch (event.type) {
      case 'RESPONSE_TIMER_STARTED':
      case 'FINAL_WAGER_WINDOW_STARTED':
      case 'FINAL_RESPONSE_WINDOW_STARTED':
        starts += 1
        break
      case 'RESPONSE_TIMER_PAUSED':
      case 'FINAL_WAGER_WINDOW_PAUSED':
      case 'FINAL_RESPONSE_WINDOW_PAUSED':
        pauses += 1
        break
      case 'RESPONSE_TIMER_RESUMED':
      case 'FINAL_WAGER_WINDOW_RESUMED':
      case 'FINAL_RESPONSE_WINDOW_RESUMED':
        resumes += 1
        break
      case 'RESPONSE_TIMER_EXPIRED':
      case 'FINAL_WAGER_WINDOW_EXPIRED':
      case 'FINAL_RESPONSE_WINDOW_EXPIRED':
        expirations += 1
        break
      case 'RESPONSE_TIMER_INTERRUPTED':
        interruptions += 1
        break
      case 'RESPONSE_PHASE_RESET':
        resets += 1
        break
      default:
        break
    }
  }

  return {
    observed: { starts, pauses, resumes, expirations, interruptions, resets },
  }
}

function buildBuzzActivity(effective: readonly SessionEvent[]): SessionSummaryBuzzActivityV1 {
  let acceptedBuzzCount = 0
  let activeResponseResolutionCount = 0
  for (const event of effective) {
    if (event.type === 'TEAM_BUZZED') acceptedBuzzCount += 1
    if (event.type === 'ACTIVE_RESPONSE_RESOLVED') activeResponseResolutionCount += 1
  }
  return { observed: { acceptedBuzzCount, activeResponseResolutionCount } }
}

function buildCategoryBoards(
  effective: readonly SessionEvent[],
  game: PrivateGameState,
  definition: GameDefinition,
): SessionSummaryCategoryBoardSectionV1 {
  const boardRounds = definition.rounds.filter(
    (round) => readCategoryBoardDefinition(round) !== null,
  )
  if (boardRounds.length === 0) {
    return { kind: 'none', reason: 'no-category-board-rounds' }
  }

  const rounds: SessionSummaryCategoryBoardRoundV1[] = []
  for (const round of boardRounds) {
    const board = readCategoryBoardDefinition(round)
    if (board === null) continue
    rounds.push(buildOneCategoryBoard(effective, game, round.id, round.title, board))
  }
  return { kind: 'rounds', rounds }
}

function buildOneCategoryBoard(
  effective: readonly SessionEvent[],
  game: PrivateGameState,
  roundId: string,
  roundTitle: string,
  board: CategoryBoardDefinition,
): SessionSummaryCategoryBoardRoundV1 {
  let tileSelections = 0
  let promptReveals = 0
  let answerReveals = 0
  let returnsToBoard = 0
  let tileLinkedScoreAdjustments = 0
  let acceptedBuzzes = 0
  let activeResponseResolutions = 0
  let timerStarts = 0
  let timerPauses = 0
  let timerResumes = 0
  let timerExpirations = 0
  let timerInterruptions = 0
  let timerResets = 0
  const tilesWithScore = new Set<string>()

  for (const event of effective) {
    switch (event.type) {
      case 'CATEGORY_BOARD_TILE_SELECTED':
        if (event.roundId === roundId) tileSelections += 1
        break
      case 'CATEGORY_BOARD_PROMPT_REVEALED':
        if (event.roundId === roundId) promptReveals += 1
        break
      case 'CATEGORY_BOARD_ANSWER_REVEALED':
        if (event.roundId === roundId) answerReveals += 1
        break
      case 'CATEGORY_BOARD_RETURNED':
        if (event.roundId === roundId) returnsToBoard += 1
        break
      case 'TEAM_SCORE_ADJUSTED':
        if (
          event.source.kind === 'category-board-tile' &&
          event.source.roundId === roundId
        ) {
          tileLinkedScoreAdjustments += 1
          tilesWithScore.add(event.source.tileId)
        }
        break
      case 'TEAM_BUZZED':
        if (event.roundId === roundId) acceptedBuzzes += 1
        break
      case 'ACTIVE_RESPONSE_RESOLVED':
        if (event.roundId === roundId) activeResponseResolutions += 1
        break
      case 'RESPONSE_TIMER_STARTED':
        if (event.roundId === roundId) timerStarts += 1
        break
      case 'RESPONSE_TIMER_PAUSED':
        if (event.roundId === roundId) timerPauses += 1
        break
      case 'RESPONSE_TIMER_RESUMED':
        if (event.roundId === roundId) timerResumes += 1
        break
      case 'RESPONSE_TIMER_EXPIRED':
        if (event.roundId === roundId) timerExpirations += 1
        break
      case 'RESPONSE_TIMER_INTERRUPTED':
        if (event.roundId === roundId) timerInterruptions += 1
        break
      case 'RESPONSE_PHASE_RESET':
        if (event.roundId === roundId) timerResets += 1
        break
      default:
        break
    }
  }

  const tiles = allTiles(board)
  const boardState = categoryBoardStateFor(game, roundId)
  const consumed = boardState.usedTileIds
  let consumedWithoutScore = 0
  for (const tileId of consumed) {
    if (!tilesWithScore.has(tileId)) consumedWithoutScore += 1
  }

  let clearedCategories = 0
  for (const category of board.categories) {
    if (category.tiles.length === 0) continue
    const allConsumed = category.tiles.every((tile) => consumed.includes(tile.id))
    if (allConsumed) clearedCategories += 1
  }

  return {
    roundId,
    roundTitle,
    observed: {
      tileSelections,
      promptReveals,
      answerReveals,
      returnsToBoard,
      tileLinkedScoreAdjustments,
      acceptedBuzzes,
      activeResponseResolutions,
      timerStarts,
      timerPauses,
      timerResumes,
      timerExpirations,
      timerInterruptions,
      timerResets,
    },
    derived: {
      totalTiles: tiles.length,
      consumedTiles: consumed.length,
      consumedTilesWithoutTileLinkedScore: consumedWithoutScore,
      totalCategories: board.categories.length,
      clearedCategories,
    },
  }
}

function buildFinalSection(
  effective: readonly SessionEvent[],
  gameBeforeEnd: PrivateGameState,
  endedGame: PrivateGameState,
  definition: GameDefinition,
  terminalPath: SessionSummaryTerminalPathV1,
): SessionSummaryFinalSectionV1 {
  const finalRound = findFinalRound(definition)
  if (finalRound === null) {
    return { kind: 'unavailable', reason: 'no-final-round' }
  }

  const before = finalWagerStateFor(gameBeforeEnd, finalRound.id)
  const after = finalWagerStateFor(endedGame, finalRound.id)
  // Prefer pre-end Final facts (phase not yet collapsed to `ended`).
  const final = before.snapshot !== null ? before : after

  if (final.snapshot === null) {
    return { kind: 'unavailable', reason: 'final-not-begun' }
  }

  const resolutionPath = classifyFinalResolutionPath(final, terminalPath, definition, gameBeforeEnd)
  if (resolutionPath === 'host-ended-incomplete') {
    // Still report aggregate observed facts that were recorded, with an honest
    // incomplete resolution path — but only when Final began. Raw private values
    // stay out.
    return {
      kind: 'available',
      roundId: finalRound.id,
      roundTitle: finalRound.title,
      observed: observeFinal(effective, finalRound.id, final),
      derived: deriveFinal(final, resolutionPath),
    }
  }

  return {
    kind: 'available',
    roundId: finalRound.id,
    roundTitle: finalRound.title,
    observed: observeFinal(effective, finalRound.id, final),
    derived: deriveFinal(final, resolutionPath),
  }
}

function classifyFinalResolutionPath(
  final: FinalWagerRoundState,
  terminalPath: SessionSummaryTerminalPathV1,
  definition: GameDefinition,
  gameBeforeEnd: PrivateGameState,
): SessionSummaryFinalResolutionPathV1 {
  if (terminalPath === 'final-accepted-tied-finish') return 'accepted-tied-finish'
  if (terminalPath === 'final-sudden-death-winner') return 'sudden-death-winner'
  if (terminalPath === 'final-unique-winner') {
    if (final.snapshot !== null && final.snapshot.teams.length === 0) {
      return 'zero-eligible-complete'
    }
    return 'unique-winner'
  }

  // Host-ended while Final was in progress (or still tied in sudden death).
  const leaders = uniqueLeaders(definition.teams, (teamId) =>
    teamScoreFor(gameBeforeEnd, teamId),
  )
  const settledCount = Object.keys(final.settlements).length
  const eligible = final.snapshot?.teams.length ?? 0
  const completeEnough =
    (eligible === 0 &&
      (final.phase === 'ready-to-complete' ||
        final.phase === 'resolution' ||
        final.phase === 'ended')) ||
    (eligible > 0 && settledCount >= eligible && leaders.length === 1)

  if (!completeEnough) return 'host-ended-incomplete'
  return 'unique-winner'
}

function observeFinal(
  effective: readonly SessionEvent[],
  roundId: string,
  final: FinalWagerRoundState,
): SessionSummaryFinalObservedV1 {
  let wagerEntryEventCount = 0
  let responseEntryEventCount = 0
  let settlementCount = 0
  const wagerWindow = { starts: 0, pauses: 0, resumes: 0, expirations: 0 }
  const responseWindow = { starts: 0, pauses: 0, resumes: 0, expirations: 0 }

  for (const event of effective) {
    switch (event.type) {
      case 'FINAL_TEAM_WAGER_RECORDED':
        if (event.roundId === roundId) wagerEntryEventCount += 1
        break
      case 'FINAL_TEAM_RESPONSE_RECORDED':
        if (event.roundId === roundId) responseEntryEventCount += 1
        break
      case 'FINAL_TEAM_SETTLED':
        if (event.roundId === roundId) settlementCount += 1
        break
      case 'FINAL_WAGER_WINDOW_STARTED':
        if (event.roundId === roundId) wagerWindow.starts += 1
        break
      case 'FINAL_WAGER_WINDOW_PAUSED':
        if (event.roundId === roundId) wagerWindow.pauses += 1
        break
      case 'FINAL_WAGER_WINDOW_RESUMED':
        if (event.roundId === roundId) wagerWindow.resumes += 1
        break
      case 'FINAL_WAGER_WINDOW_EXPIRED':
        if (event.roundId === roundId) wagerWindow.expirations += 1
        break
      case 'FINAL_RESPONSE_WINDOW_STARTED':
        if (event.roundId === roundId) responseWindow.starts += 1
        break
      case 'FINAL_RESPONSE_WINDOW_PAUSED':
        if (event.roundId === roundId) responseWindow.pauses += 1
        break
      case 'FINAL_RESPONSE_WINDOW_RESUMED':
        if (event.roundId === roundId) responseWindow.resumes += 1
        break
      case 'FINAL_RESPONSE_WINDOW_EXPIRED':
        if (event.roundId === roundId) responseWindow.expirations += 1
        break
      default:
        break
    }
  }

  const snapshot = final.snapshot
  if (snapshot === null) {
    throw new Error('observeFinal requires a begun Final')
  }

  return {
    eligibilityMode: snapshot.mode,
    eligibleTeamCount: snapshot.teams.length,
    wagerEntryEventCount,
    responseEntryEventCount,
    settlementCount,
    wagerWindow,
    responseWindow,
  }
}

function deriveFinal(
  final: FinalWagerRoundState,
  resolutionPath: SessionSummaryFinalResolutionPathV1,
): SessionSummaryFinalDerivedV1 {
  const distinctWagerParticipantCount = Object.keys(final.wagers).length
  let exact = 0
  let notCaptured = 0
  let noResponse = 0
  for (const response of Object.values(final.responses)) {
    if (response.kind === 'exact') exact += 1
    else if (response.kind === 'not-captured') notCaptured += 1
    else noResponse += 1
  }

  let correct = 0
  let incorrect = 0
  let settlementNoResponse = 0
  for (const settlement of Object.values(final.settlements)) {
    if (settlement.outcome === 'correct') correct += 1
    else if (settlement.outcome === 'incorrect') incorrect += 1
    else settlementNoResponse += 1
  }

  return {
    distinctWagerParticipantCount,
    responseStateCounts: { exact, notCaptured, noResponse },
    settlementOutcomeCounts: {
      correct,
      incorrect,
      noResponse: settlementNoResponse,
    },
    resolutionPath,
  }
}

function findFinalRound(definition: GameDefinition): {
  readonly id: string
  readonly title: string
} | null {
  for (const round of definition.rounds) {
    if (round.type === 'final-wager') {
      return { id: round.id, title: round.title }
    }
  }
  return null
}

function uniqueLeaders(
  teams: readonly TeamDefinition[],
  scoreFor: (teamId: string) => number,
): readonly string[] {
  if (teams.length === 0) return []
  let best = Number.NEGATIVE_INFINITY
  for (const team of teams) {
    const score = scoreFor(team.id)
    if (score > best) best = score
  }
  return teams.filter((team) => scoreFor(team.id) === best).map((team) => team.id)
}

function findLastIndex<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index
  }
  return -1
}
