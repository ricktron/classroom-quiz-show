/**
 * Session Summary Contract v1 (Slice 15).
 *
 * A versioned, host-private, current-session-only summary derived exclusively
 * from authoritative event history and deterministic replay. It is not a
 * persisted archive, export format, grading system, public display DTO, or
 * analytics store.
 *
 * Field truthfulness:
 *  - `observed` — counted directly from effective authoritative events
 *  - `derived` — computed deterministically from replayed private state (and
 *    authored definition lookups that those events already authorize)
 *  - `unavailable` — information that is not honestly representable (no Final
 *    begun, incomplete Final, unsupported round, etc.)
 */

/** Discriminator for the summary document family. */
export const SESSION_SUMMARY_CONTRACT_KIND =
  'classroom-quiz-show/session-summary' as const

/** Explicit contract version. Bump only with a reviewed contract change. */
export const SESSION_SUMMARY_CONTRACT_VERSION = 1 as const

/** How the summary was produced from history. */
export type SessionSummaryDerivationBasisV1 = {
  readonly kind: 'effective-history-and-replay'
  /** Events remaining after undo neutralization. */
  readonly effectiveEventCount: number
  /** Full append-only history length, including undone events and undo markers. */
  readonly historyEventCount: number
}

/**
 * Terminal-path classification for a completed session.
 *
 * Classified from effective history and the replayed state immediately before
 * the irreversible `GAME_SESSION_ENDED` event. Never inferred solely because the
 * game ended.
 */
export type SessionSummaryTerminalPathV1 =
  | 'ordinary-or-host-ended'
  | 'final-unique-winner'
  | 'final-accepted-tied-finish'
  | 'final-sudden-death-winner'

/** One row in the final standings, with shared-rank ties. */
export interface SessionSummaryStandingV1 {
  readonly rank: number
  readonly teamId: string
  readonly teamName: string
  readonly finalScore: number
  /** True when at least one other team shares this rank. */
  readonly tied: boolean
}

/** Descriptive score activity — never accuracy, mastery, or grades. */
export interface SessionSummaryScoreActivityV1 {
  readonly observed: {
    readonly scoreChangeCount: number
    readonly tileLinkedAdjustmentCount: number
    readonly manualAdjustmentCount: number
    readonly finalSettlementCount: number
    readonly perTeam: readonly {
      readonly teamId: string
      readonly teamName: string
      readonly scoreChangeCount: number
      readonly netDelta: number
      readonly finalScore: number
    }[]
  }
  readonly derived: {
    readonly standings: readonly SessionSummaryStandingV1[]
  }
}

/** Timer transition counts from effective history (response + Final windows). */
export interface SessionSummaryTimerActivityV1 {
  readonly observed: {
    readonly starts: number
    readonly pauses: number
    readonly resumes: number
    readonly expirations: number
    readonly interruptions: number
    readonly resets: number
  }
}

/** Accepted buzz and active-response resolution activity. */
export interface SessionSummaryBuzzActivityV1 {
  readonly observed: {
    readonly acceptedBuzzCount: number
    readonly activeResponseResolutionCount: number
  }
}

/**
 * Category-board round summary. Observed counts come from effective events for
 * that round; derived board facts come from the definition plus replayed used
 * tiles.
 */
export interface SessionSummaryCategoryBoardRoundV1 {
  readonly roundId: string
  readonly roundTitle: string
  readonly observed: {
    readonly tileSelections: number
    readonly promptReveals: number
    readonly answerReveals: number
    readonly returnsToBoard: number
    readonly tileLinkedScoreAdjustments: number
    readonly acceptedBuzzes: number
    readonly activeResponseResolutions: number
    readonly timerStarts: number
    readonly timerPauses: number
    readonly timerResumes: number
    readonly timerExpirations: number
    readonly timerInterruptions: number
    readonly timerResets: number
  }
  readonly derived: {
    readonly totalTiles: number
    readonly consumedTiles: number
    readonly consumedTilesWithoutTileLinkedScore: number
    readonly totalCategories: number
    readonly clearedCategories: number
  }
}

export type SessionSummaryCategoryBoardSectionV1 =
  | {
      readonly kind: 'rounds'
      readonly rounds: readonly SessionSummaryCategoryBoardRoundV1[]
    }
  | {
      readonly kind: 'none'
      readonly reason: 'no-category-board-rounds'
    }

/** Final resolution path when a Final began and completed enough to classify. */
export type SessionSummaryFinalResolutionPathV1 =
  | 'unique-winner'
  | 'accepted-tied-finish'
  | 'sudden-death-winner'
  | 'host-ended-incomplete'
  | 'zero-eligible-complete'

export interface SessionSummaryFinalObservedV1 {
  readonly eligibilityMode: 'classic' | 'inclusive'
  readonly eligibleTeamCount: number
  readonly wagerEntryEventCount: number
  readonly responseEntryEventCount: number
  readonly settlementCount: number
  readonly wagerWindow: {
    readonly starts: number
    readonly pauses: number
    readonly resumes: number
    readonly expirations: number
  }
  readonly responseWindow: {
    readonly starts: number
    readonly pauses: number
    readonly resumes: number
    readonly expirations: number
  }
}

export interface SessionSummaryFinalDerivedV1 {
  readonly distinctWagerParticipantCount: number
  readonly responseStateCounts: {
    readonly exact: number
    readonly notCaptured: number
    readonly noResponse: number
  }
  readonly settlementOutcomeCounts: {
    readonly correct: number
    readonly incorrect: number
    readonly noResponse: number
  }
  readonly resolutionPath: SessionSummaryFinalResolutionPathV1
}

export type SessionSummaryFinalSectionV1 =
  | {
      readonly kind: 'available'
      readonly roundId: string
      readonly roundTitle: string
      readonly observed: SessionSummaryFinalObservedV1
      readonly derived: SessionSummaryFinalDerivedV1
    }
  | {
      readonly kind: 'unavailable'
      readonly reason:
        | 'no-final-round'
        | 'final-not-begun'
        | 'final-incomplete'
        | 'unsupported-final-state'
    }

/**
 * Bounded reason a Session Summary V1 document cannot summarize an authored
 * round. Version 1 only summarizes `category-board` and `final-wager`.
 */
export type SessionSummaryUnavailableRoundReasonV1 = 'unsupported-round-type'

/**
 * Operational identity for an authored round that Session Summary V1 cannot
 * summarize. Deliberately excludes gameplay metrics and generic metadata bags.
 */
export interface SessionSummaryUnavailableRoundV1 {
  readonly roundId: string
  readonly roundTitle: string
  /** Authored round-type string from the replayed game definition. */
  readonly authoredRoundType: string
  readonly reason: SessionSummaryUnavailableRoundReasonV1
}

/**
 * The available completed-session summary document.
 *
 * Deliberately excludes: full event history, generic metadata bags, raw private
 * Final text/wagers/notes/alternates, public display DTOs, and persistence
 * records.
 */
export interface SessionSummaryV1 {
  readonly kind: typeof SESSION_SUMMARY_CONTRACT_KIND
  readonly version: typeof SESSION_SUMMARY_CONTRACT_VERSION
  readonly derivationBasis: SessionSummaryDerivationBasisV1
  readonly sessionId: string
  readonly gameId: string
  readonly gameTitle: string
  /** `occurredAt` of the effective `SESSION_INITIALIZED` event. */
  readonly recordedSessionStartAt: number
  /** `occurredAt` of the effective `GAME_SESSION_ENDED` event. */
  readonly recordedCompletionAt: number
  readonly terminalPath: SessionSummaryTerminalPathV1
  readonly scoreActivity: SessionSummaryScoreActivityV1
  readonly timerActivity: SessionSummaryTimerActivityV1
  readonly buzzActivity: SessionSummaryBuzzActivityV1
  readonly categoryBoards: SessionSummaryCategoryBoardSectionV1
  readonly finalWager: SessionSummaryFinalSectionV1
  /**
   * Every authored round that Session Summary V1 does not summarize as a
   * category-board or Final Wager section. Never invents zero-filled metrics.
   */
  readonly unavailableRounds: readonly SessionSummaryUnavailableRoundV1[]
}

/**
 * Discriminated result of {@link deriveSessionSummaryV1}.
 *
 * An available summary is returned only for a completed game session. Active or
 * incomplete games never produce a zero-filled summary.
 */
export type SessionSummaryResultV1 =
  | { readonly status: 'available'; readonly summary: SessionSummaryV1 }
  | { readonly status: 'no-session' }
  | { readonly status: 'no-game' }
  | { readonly status: 'active-or-incomplete' }
  | { readonly status: 'invalid-history'; readonly reason: string }
