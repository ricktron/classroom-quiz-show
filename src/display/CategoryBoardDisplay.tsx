/**
 * The projector view of a `category-board` round (Slice 5 + Slice 11 media +
 * S05 board/round-flow presentation choreography).
 *
 * This component renders sanitized `PublicState` and nothing else. It has no
 * access to the private definition, cannot request more data, and does not
 * reconstruct a board from anything — it draws exactly the DTO it was handed.
 * Because that DTO is stage-discriminated, the categories/tile values and the
 * open-tile content are never both present, so there is no hidden content in
 * the DOM waiting to be inspected:
 *
 *  - `board`    — category headers and tile values only. No prompt, no answer.
 *  - `selected` — the chosen category and value. No prompt yet.
 *  - `prompt`   — the prompt (text or image). `answer` is `null`, so no answer
 *                 element exists.
 *  - `answer`   — the prompt is RETAINED above the answer (documented design:
 *                 a class needs the question in view while discussing the
 *                 answer) plus the canonical answer string.
 *
 * Teacher notes and alternate answers are not in the DTO at all, at any stage.
 *
 * It fails closed: a payload it cannot make sense of renders the neutral
 * "not available" panel rather than a partial or guessed board.
 *
 * ## Board / round-flow presentation (S05)
 *
 * Local semantic stage identity + remount-safe seed/ack (buzz/outcome pattern):
 * first observation seeds without fabricating reveal/selection/prompt/return
 * ceremony; observed forward transitions may acknowledge (direction-aware —
 * undo must not look like forward ceremony). Optional return-to-board tile
 * orientation uses prior already-public selection (categoryTitle + value) held
 * only in this mounted lifecycle — never persisted / never synchronized — and
 * orients only when exactly one used tile matches (0 or 2+ → suppress).
 * Category-clear acknowledgement fires only when cleared keys newly appear
 * after seed. Motion yields when `ownsFlowMotion` is false (buzz/outcome).
 */

import { useEffect, useRef, useState } from 'react'
import { PUBLIC_BOARD_KIND, type PublicRoundState } from '../state/publicState'
import { MediaContentDisplay } from './MediaContentDisplay'
import type { BoardDepletion } from './audience/selectAudiencePresentation'
import {
  PRESENTATION_ACK_HOLD_MS,
  useSemanticPresentationAck,
} from './useSemanticPresentationAck'
import './CategoryBoardDisplay.css'

export interface CategoryBoardDisplayProps {
  readonly round: PublicRoundState
  /** Cleared category keys derived from currently visible tiles only. */
  readonly clearedCategoryKeys?: readonly string[]
  /** Visible-board depletion summary; absent outside public board stage. */
  readonly depletion?: BoardDepletion | null
  /**
   * When false, suppress board/clue flow acknowledgement so buzz / board-outcome
   * motion can dominate. Local composition prop only — not PublicState.
   */
  readonly ownsFlowMotion?: boolean
}

type BoardFlowStage = 'board' | 'selected' | 'prompt' | 'answer'

type BoardFlowIdentity =
  | { readonly stage: 'board' }
  | {
      readonly stage: 'selected' | 'prompt' | 'answer'
      readonly categoryTitle: string
      readonly value: number
    }

/** Local semantic identity for board ↔ clue stage flow. */
function boardFlowSemanticId(round: Extract<PublicRoundState, { kind: typeof PUBLIC_BOARD_KIND }>): string {
  if (round.stage === 'board') return 'board'
  const { categoryTitle, value } = round.selection
  return `${round.stage}:${categoryTitle}:${value}`
}

/** Parse board-flow semantic id into stage (+ public selection when on a clue). */
function parseBoardFlowIdentity(id: string | null | undefined): BoardFlowIdentity | null {
  if (!id) return null
  if (id === 'board') return { stage: 'board' }
  const match = /^(selected|prompt|answer):(.+):(\d+)$/.exec(id)
  if (!match) return null
  return {
    stage: match[1] as Exclude<BoardFlowStage, 'board'>,
    categoryTitle: match[2]!,
    value: Number(match[3]),
  }
}

/**
 * Direction-aware board/clue acknowledgement.
 *
 * Forward `board → selected` and `selected → prompt` may ack. Return
 * `prompt|answer → board` may ack board-enter. Undo / fail-safe paths must not
 * look like forward ceremony: `prompt → selected`, `answer → prompt`, and
 * `selected → board` suppress. Never fabricate answer ceremony.
 */
function shouldAcknowledgeBoardFlow(previous: string | null, next: string | null): boolean {
  const nextId = parseBoardFlowIdentity(next)
  if (!nextId) return false
  if (nextId.stage === 'answer') return false

  const previousId = parseBoardFlowIdentity(previous)
  if (!previousId) return false

  if (nextId.stage === 'board') {
    // Completed clue return may acknowledge; undoing selection must not.
    return previousId.stage === 'prompt' || previousId.stage === 'answer'
  }

  if (nextId.stage === 'selected') {
    return previousId.stage === 'board'
  }

  if (nextId.stage === 'prompt') {
    return (
      previousId.stage === 'selected' &&
      previousId.categoryTitle === nextId.categoryTitle &&
      previousId.value === nextId.value
    )
  }

  return false
}

/** Parse already-public selection identity from a flow semantic id. */
function selectionFromFlowId(
  id: string | null | undefined,
): { categoryTitle: string; value: number } | null {
  const parsed = parseBoardFlowIdentity(id)
  if (!parsed || parsed.stage === 'board') return null
  return { categoryTitle: parsed.categoryTitle, value: parsed.value }
}

/**
 * Return-tile orientation only when exactly one used public tile matches the
 * prior already-public selection (categoryTitle + value). Zero or multiple
 * matches → suppress (never first-match).
 */
function uniqueReturnOrientTileKey(
  categories: Extract<
    PublicRoundState,
    { kind: typeof PUBLIC_BOARD_KIND; stage: 'board' }
  >['categories'],
  target: { categoryTitle: string; value: number },
): string | null {
  const matches: string[] = []
  for (const category of categories) {
    if (category.title !== target.categoryTitle) continue
    for (const tile of category.tiles) {
      if (tile.used && tile.value === target.value) {
        matches.push(tile.key)
      }
    }
  }
  return matches.length === 1 ? matches[0]! : null
}

/** The neutral screen used whenever the round cannot be rendered safely. */
function Unavailable() {
  return (
    <div className="cbd cbd--unavailable" data-testid="cbd-unavailable">
      <p className="cbd__unavailable-text">This round is not available yet</p>
    </div>
  )
}

export function CategoryBoardDisplay({
  round,
  clearedCategoryKeys = [],
  depletion = null,
  ownsFlowMotion = true,
}: CategoryBoardDisplayProps) {
  if (round.kind !== PUBLIC_BOARD_KIND) return <Unavailable />

  return (
    <CategoryBoardFlow
      round={round}
      clearedCategoryKeys={clearedCategoryKeys}
      depletion={depletion}
      ownsFlowMotion={ownsFlowMotion}
    />
  )
}

function CategoryBoardFlow({
  round,
  clearedCategoryKeys,
  depletion,
  ownsFlowMotion,
}: {
  readonly round: Extract<PublicRoundState, { kind: typeof PUBLIC_BOARD_KIND }>
  readonly clearedCategoryKeys: readonly string[]
  readonly depletion: BoardDepletion | null
  readonly ownsFlowMotion: boolean
}) {
  const flowId = boardFlowSemanticId(round)
  const { seeded, changed: flowChanged } = useSemanticPresentationAck(flowId, {
    shouldAcknowledge: shouldAcknowledgeBoardFlow,
    ownsMotion: ownsFlowMotion,
  })

  // Prior already-public selection retained only for return-to-board orientation.
  const priorSelectionRef = useRef<{ categoryTitle: string; value: number } | null>(null)
  const [orientTileKey, setOrientTileKey] = useState<string | null>(null)
  const [orientEpoch, setOrientEpoch] = useState(0)
  const previousFlowIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const previous = previousFlowIdRef.current
    if (previous === undefined) {
      previousFlowIdRef.current = flowId
      const seededSelection = selectionFromFlowId(flowId)
      if (seededSelection) priorSelectionRef.current = seededSelection
      return
    }

    const prevSelection = selectionFromFlowId(previous)
    if (prevSelection) priorSelectionRef.current = prevSelection

    previousFlowIdRef.current = flowId

    // Observed clue → board: orient only when exactly one used tile matches.
    if (
      ownsFlowMotion &&
      flowId === 'board' &&
      previous !== 'board' &&
      priorSelectionRef.current &&
      round.stage === 'board'
    ) {
      const found = uniqueReturnOrientTileKey(round.categories, priorSelectionRef.current)
      if (found) {
        setOrientTileKey(found)
        setOrientEpoch((epoch) => epoch + 1)
        return
      }
    }

    if (flowId !== 'board') {
      setOrientTileKey(null)
    }
  }, [flowId, ownsFlowMotion, round])

  useEffect(() => {
    if (!orientTileKey) return
    const clearId = window.setTimeout(() => setOrientTileKey(null), PRESENTATION_ACK_HOLD_MS)
    return () => window.clearTimeout(clearId)
  }, [orientTileKey, orientEpoch])

  // Category-clear: seed cleared-key set on board; ack only newly appearing keys
  // after seed. Preserve prior board cleared memory while a clue is open so a
  // return that newly clears a category can acknowledge without replaying older
  // clears (off-board props are empty — must not reset seed to []).
  const clearedSeedRef = useRef<Set<string> | undefined>(undefined)
  const [clearAckKeys, setClearAckKeys] = useState<readonly string[]>([])
  const [clearEpoch, setClearEpoch] = useState(0)
  const clearedKey = clearedCategoryKeys.join('\0')

  useEffect(() => {
    const next = new Set(clearedCategoryKeys)
    const previous = clearedSeedRef.current

    if (round.stage !== 'board') {
      setClearAckKeys([])
      return
    }

    if (previous === undefined) {
      clearedSeedRef.current = next
      return
    }

    if (!ownsFlowMotion) {
      clearedSeedRef.current = next
      setClearAckKeys([])
      return
    }

    const newly: string[] = []
    for (const key of next) {
      if (!previous.has(key)) newly.push(key)
    }
    clearedSeedRef.current = next
    if (newly.length > 0) {
      setClearAckKeys(newly)
      setClearEpoch((epoch) => epoch + 1)
    }
  }, [clearedKey, clearedCategoryKeys, round.stage, ownsFlowMotion])

  useEffect(() => {
    if (clearAckKeys.length === 0) return
    const clearId = window.setTimeout(() => setClearAckKeys([]), PRESENTATION_ACK_HOLD_MS)
    return () => window.clearTimeout(clearId)
  }, [clearAckKeys, clearEpoch])

  const flowMoment =
    flowChanged && flowId === 'board'
      ? 'board-enter'
      : flowChanged && flowId.startsWith('selected:')
        ? 'selection'
        : flowChanged && flowId.startsWith('prompt:')
          ? 'prompt-reveal'
          : 'none'

  if (round.stage === 'board') {
    if (round.categories.length === 0) return <Unavailable />
    const cleared = new Set(clearedCategoryKeys)
    const clearAck = new Set(clearAckKeys)
    const boardEnterClass = flowMoment === 'board-enter' ? ' cbd--flow-ack cbd--board-enter' : ''
    return (
      <div
        className={`cbd${boardEnterClass}`}
        data-testid="cbd-board"
        data-used-tiles={depletion?.usedTiles}
        data-total-tiles={depletion?.totalTiles}
        data-board-cleared={depletion?.boardCleared ? 'true' : 'false'}
        data-seeded={seeded ? 'true' : 'false'}
        data-flow-ack={flowMoment === 'board-enter' ? 'true' : 'false'}
        data-flow-moment={flowMoment}
        data-orient-tile={orientTileKey ?? undefined}
      >
        {depletion && depletion.totalTiles > 0 && (
          <p className="cbd__depletion" data-testid="cbd-depletion">
            {depletion.usedTiles} of {depletion.totalTiles} clues used
          </p>
        )}
        <div className="cbd__grid">
          {round.categories.map((category) => {
            const isCleared = cleared.has(category.key)
            const clearAckClass =
              isCleared && clearAck.has(category.key) ? ' cbd__column--clear-ack' : ''
            return (
              <div
                className={`cbd__column${isCleared ? ' cbd__column--cleared' : ''}${clearAckClass}`}
                key={category.key}
                data-testid={`cbd-category-${category.key}`}
                data-cleared={isCleared ? 'true' : 'false'}
                data-clear-ack={clearAck.has(category.key) ? 'true' : 'false'}
              >
                <h2 className="cbd__category">
                  {category.title}
                  {isCleared && (
                    <span className="cbd__cleared-label" data-testid={`cbd-cleared-${category.key}`}>
                      {' '}
                      Cleared
                    </span>
                  )}
                </h2>
                <ul className="cbd__tiles">
                  {category.tiles.map((tile) => {
                    const orient =
                      orientTileKey === tile.key ? ' cbd__tile--return-orient' : ''
                    return (
                      <li
                        key={tile.key}
                        className={`cbd__tile${tile.used ? ' cbd__tile--used' : ''}${orient}`}
                        data-testid={`cbd-tile-${tile.key}`}
                        data-return-orient={orientTileKey === tile.key ? 'true' : 'false'}
                      >
                        {/*
                          A used tile is marked with the WORD "Used", not just a
                          dimmed colour, so the state survives a washed-out
                          projector and colour-blind viewers. Used never implies
                          correctness or ownership.
                        */}
                        {tile.used ? (
                          <span className="cbd__tile-used">Used</span>
                        ) : (
                          <span className="cbd__tile-value">{tile.value}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const { selection } = round
  // Impossible stage/payload pairing (prompt content missing at the prompt
  // stage, answer missing at the answer stage) → neutral panel, never a
  // half-render.
  if (round.stage !== 'selected' && selection.prompt === null) return <Unavailable />
  if (round.stage === 'answer' && selection.answer === null) return <Unavailable />

  const answerRevealed = selection.answer !== null
  const selectionAck = flowMoment === 'selection'
  const promptAck = flowMoment === 'prompt-reveal'
  const openAckClass =
    selectionAck || promptAck
      ? ` cbd--flow-ack${selectionAck ? ' cbd--selection-ack' : ''}${promptAck ? ' cbd--prompt-ack' : ''}`
      : ''

  return (
    <div
      className={`cbd cbd--open${answerRevealed ? ' cbd--answer' : ''}${openAckClass}`}
      data-testid="cbd-open"
      data-answer-revealed={answerRevealed ? 'true' : 'false'}
      data-seeded={seeded ? 'true' : 'false'}
      data-flow-ack={selectionAck || promptAck ? 'true' : 'false'}
      data-flow-moment={flowMoment}
    >
      <p
        className={`cbd__selection-header${selectionAck ? ' cbd__selection-header--ack' : ''}`}
        data-testid="cbd-selection-header"
        data-selection-ack={selectionAck ? 'true' : 'false'}
      >
        <span className="cbd__selection-category" data-testid="cbd-category">
          {selection.categoryTitle}
        </span>
        <span className="cbd__selection-value" data-testid="cbd-value">
          {selection.value}
        </span>
      </p>

      {selection.prompt !== null && (
        <div
          className={`cbd__prompt${promptAck ? ' cbd__prompt--ack' : ''}`}
          data-testid="cbd-prompt"
          data-prompt-ack={promptAck ? 'true' : 'false'}
        >
          <MediaContentDisplay content={selection.prompt} />
        </div>
      )}

      {answerRevealed && (
        <p className="cbd__answer" data-testid="cbd-answer">
          <span className="cbd__answer-label">Answer</span>
          <span className="cbd__answer-text">{selection.answer}</span>
        </p>
      )}
    </div>
  )
}
