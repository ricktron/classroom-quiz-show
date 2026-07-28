import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import type { PrivateGameState } from '../state/privateState'
import { categoryBoardStateFor } from '../state/reducer'
import {
  findTileLocation,
  readCategoryBoardDefinition,
  type CategoryBoardTile,
} from '../game/categoryBoard/definition'
import {
  assertNeverPromptKind,
  type PromptContent,
} from '../game/media/definition'
import { resolveSameOriginMediaSrc } from '../display/resolveSameOriginMediaSrc'
import { systemClock, type Clock } from '../time/clock'
import './CategoryBoardHostPanel.css'

/**
 * Host controls for the active `category-board` round (Slice 5).
 *
 * This panel is deliberately bounded to REVEALING: it selects a tile, reveals the
 * prompt, reveals the answer, and returns to the board. It moves no points. Teams
 * and scoring live in their own panel (`TeamScoringPanel`, Slice 6) precisely so
 * that revealing an answer and awarding credit stay two separate teacher
 * decisions — nothing here can fire a score, and nothing there can reveal
 * content. Timers and buzzers (Slice 7) are not smuggled in either.
 *
 * ## Private preview vs. public content
 *
 * The host legitimately sees more than the class: the prompt, the answer, the
 * acceptable alternates, and the teacher notes are all visible from the moment
 * a tile is selected. The panel therefore makes the distinction explicit rather
 * than implicit — every private block is badged "Host only", and a persistent
 * "On the display now" line states exactly what the projector is showing. A
 * teacher must never have to guess whether the answer is already up.
 *
 * ## Bounded controls
 *
 * Only the transitions the reducer will actually accept are rendered, so the
 * panel cannot offer an action that would be rejected. The store is still the
 * authority: every button dispatches a command carrying the round id it was
 * rendered for, and the planner rejects it if the current round has moved on.
 * A stale panel is inert, not dangerous.
 */

export interface CategoryBoardHostPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  /**
   * The dispatch-edge clock (Slice 7). Injectable so the host surface has exactly
   * one place the real clock enters it — see `src/time/clock.ts`.
   */
  readonly clock?: Clock
}

/** Public copy describing exactly what the projector is showing right now. */
const PUBLIC_STAGE_COPY = {
  board: 'the board grid (no prompt, no answer)',
  selected: 'the chosen category and value only (no prompt yet)',
  prompt: 'the prompt (the answer is NOT shown)',
  answer: 'the prompt and the answer',
} as const

export function CategoryBoardHostPanel({
  dispatch,
  game,
  clock = systemClock,
}: CategoryBoardHostPanelProps) {
  const roundIndex = game.currentRoundIndex
  if (roundIndex === null || game.gameLifecycle !== 'active') return null
  const round = game.definition.rounds[roundIndex]
  if (!round) return null

  const board = readCategoryBoardDefinition(round)
  if (board === null) return null

  const boardState = categoryBoardStateFor(game, round.id)
  const progress = boardState.progress
  const used = new Set(boardState.usedTileIds)
  const now = () => clock.now()
  const location =
    progress.selectedTileId === null ? null : findTileLocation(board, progress.selectedTileId)

  return (
    <section className="cbh" aria-labelledby="cbh-title">
      <div className="foundation__tag foundation__tag--slice5">
        Category board (Slice 5) — host controls, private
      </div>
      <h3 id="cbh-title">{round.title}</h3>

      <p className="cbh__public" data-testid="cbh-public-stage" aria-live="polite">
        <span className="cbh__public-badge">On the display now</span>
        {PUBLIC_STAGE_COPY[progress.stage]}
      </p>

      {progress.stage === 'board' ? (
        <div className="cbh__grid" data-testid="cbh-grid">
          {board.categories.map((category, categoryIndex) => (
            <div className="cbh__column" key={category.id}>
              <h4 className="cbh__category" id={`cbh-cat-${categoryIndex}`}>
                {category.title}
              </h4>
              <ul className="cbh__tiles" aria-labelledby={`cbh-cat-${categoryIndex}`}>
                {category.tiles.map((tile) => {
                  const isUsed = used.has(tile.id)
                  return (
                    <li key={tile.id}>
                      <button
                        type="button"
                        className={`cbh__tile${isUsed ? ' cbh__tile--used' : ''}`}
                        data-testid={`cbh-tile-${tile.id}`}
                        disabled={isUsed}
                        aria-label={`${category.title}, ${tile.effectiveValue} points${
                          isUsed ? ', already used' : ''
                        }`}
                        onClick={() =>
                          dispatch({
                            type: 'SELECT_CATEGORY_BOARD_TILE',
                            issuedAt: now(),
                            roundId: round.id,
                            tileId: tile.id,
                          })
                        }
                      >
                        <span className="cbh__tile-value">{tile.effectiveValue}</span>
                        {/* Used state is conveyed by TEXT, not only by colour. */}
                        {isUsed && <span className="cbh__tile-used">Used</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : location === null ? (
        // Impossible private state (selection not on this board). Say so
        // host-side and offer the one safe way out.
        <div className="cbh__selected" data-testid="cbh-selected">
          <p className="host__note">
            The selected tile is no longer on this board. Return to the board to continue.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() =>
              dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: now(), roundId: round.id })
            }
          >
            Return to board
          </button>
        </div>
      ) : (
        <div className="cbh__selected" data-testid="cbh-selected">
          <p className="cbh__selection">
            <strong data-testid="cbh-selected-category">{location.category.title}</strong>
            <span className="cbh__selection-value" data-testid="cbh-selected-value">
              {location.tile.effectiveValue}
            </span>
            {location.tile.multiplier !== 1 && (
              <span className="cbh__selection-multiplier">
                ({location.tile.value} × {location.tile.multiplier})
              </span>
            )}
          </p>

          <HostOnlyPrompt prompt={location.tile.prompt} />

          <HostOnlyBlock label="Correct answer" testId="cbh-answer">
            {location.tile.answer}
          </HostOnlyBlock>

          <HostOnlyAlternates tile={location.tile} />
          <HostOnlyNotes tile={location.tile} />

          <div className="cbh__actions" role="group" aria-label="Category board reveal controls">
            {progress.stage === 'selected' && (
              <button
                type="button"
                className="btn"
                data-testid="cbh-reveal-prompt"
                onClick={() =>
                  dispatch({
                    type: 'REVEAL_CATEGORY_BOARD_PROMPT',
                    issuedAt: now(),
                    roundId: round.id,
                  })
                }
              >
                Show prompt on display
              </button>
            )}
            {progress.stage === 'prompt' && (
              <button
                type="button"
                className="btn"
                data-testid="cbh-reveal-answer"
                onClick={() =>
                  dispatch({
                    type: 'REVEAL_CATEGORY_BOARD_ANSWER',
                    issuedAt: now(),
                    roundId: round.id,
                  })
                }
              >
                Show answer on display
              </button>
            )}
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="cbh-return"
              onClick={() =>
                dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: now(), roundId: round.id })
              }
            >
              {progress.stage === 'answer' ? 'Return to board' : 'Cancel and return to board'}
            </button>
          </div>

          <p className="host__note cbh__hint">
            {progress.stage === 'answer'
              ? 'This tile is now used. Undo the answer reveal to put it back on the board. Revealing the answer awarded nothing on its own.'
              : 'Revealing does not score. Award or deduct points in the teams & scoring panel below — they are separate actions on purpose.'}
          </p>
        </div>
      )}
    </section>
  )
}

/** A labelled, badged private block. The badge is what keeps "private" explicit. */
function HostOnlyBlock({
  label,
  testId,
  children,
}: {
  readonly label: string
  readonly testId: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="cbh__private">
      <p className="cbh__private-label">
        <span className="cbh__private-badge">Host only</span>
        {label}
      </p>
      {/*
        A <div>, not a <p>: image prompts render an <img>, and HTML forbids
        interactive / replaced media inside a paragraph.
      */}
      <div className="cbh__private-body" data-testid={testId}>
        {children}
      </div>
    </div>
  )
}

/** Private host preview of typed prompt content (text or image). */
function HostOnlyPrompt({ prompt }: { readonly prompt: PromptContent }) {
  switch (prompt.kind) {
    case 'text':
      return (
        <HostOnlyBlock label="Prompt" testId="cbh-prompt">
          {prompt.text}
        </HostOnlyBlock>
      )
    case 'image':
      return (
        <HostOnlyBlock label="Prompt" testId="cbh-prompt">
          <img
            className="cbh__prompt-image"
            src={resolveSameOriginMediaSrc(prompt.source.path)}
            alt={prompt.alt}
            data-testid="cbh-prompt-image"
          />
          <p className="cbh__prompt-alt" data-testid="cbh-prompt-alt">
            {prompt.alt}
          </p>
          {prompt.caption !== null && (
            <p className="cbh__prompt-caption" data-testid="cbh-prompt-caption">
              {prompt.caption}
            </p>
          )}
          {prompt.attribution !== null && (
            <p className="cbh__prompt-attribution" data-testid="cbh-prompt-attribution">
              {prompt.attribution}
            </p>
          )}
        </HostOnlyBlock>
      )
    default:
      return assertNeverPromptKind(prompt)
  }
}

function HostOnlyAlternates({ tile }: { readonly tile: CategoryBoardTile }) {
  if (tile.alternates.length === 0) return null
  return (
    <div className="cbh__private">
      <p className="cbh__private-label">
        <span className="cbh__private-badge">Host only</span>
        Acceptable alternates
      </p>
      <ul className="cbh__alternates" data-testid="cbh-alternates">
        {tile.alternates.map((alternate) => (
          <li key={alternate}>{alternate}</li>
        ))}
      </ul>
    </div>
  )
}

function HostOnlyNotes({ tile }: { readonly tile: CategoryBoardTile }) {
  if (tile.notes === null) return null
  return (
    <HostOnlyBlock label="Teacher notes" testId="cbh-notes">
      {tile.notes}
    </HostOnlyBlock>
  )
}
