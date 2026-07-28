import { PUBLIC_BOARD_KIND, type PublicRoundState } from '../state/publicState'
import { MediaContentDisplay } from './MediaContentDisplay'
import './CategoryBoardDisplay.css'

/**
 * The projector view of a `category-board` round (Slice 5 + Slice 11 media).
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
 */

export interface CategoryBoardDisplayProps {
  readonly round: PublicRoundState
}

/** The neutral screen used whenever the round cannot be rendered safely. */
function Unavailable() {
  return (
    <div className="cbd cbd--unavailable" data-testid="cbd-unavailable">
      <p className="cbd__unavailable-text">This round is not available yet</p>
    </div>
  )
}

export function CategoryBoardDisplay({ round }: CategoryBoardDisplayProps) {
  if (round.kind !== PUBLIC_BOARD_KIND) return <Unavailable />

  if (round.stage === 'board') {
    if (round.categories.length === 0) return <Unavailable />
    return (
      <div className="cbd" data-testid="cbd-board">
        <div className="cbd__grid">
          {round.categories.map((category) => (
            <div className="cbd__column" key={category.key}>
              <h2 className="cbd__category">{category.title}</h2>
              <ul className="cbd__tiles">
                {category.tiles.map((tile) => (
                  <li
                    key={tile.key}
                    className={`cbd__tile${tile.used ? ' cbd__tile--used' : ''}`}
                    data-testid={`cbd-tile-${tile.key}`}
                  >
                    {/*
                      A used tile is marked with the WORD "Used", not just a
                      dimmed colour, so the state survives a washed-out
                      projector and colour-blind viewers.
                    */}
                    {tile.used ? (
                      <span className="cbd__tile-used">Used</span>
                    ) : (
                      <span className="cbd__tile-value">{tile.value}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

  return (
    <div className="cbd cbd--open" data-testid="cbd-open">
      <p className="cbd__selection-header">
        <span className="cbd__selection-category" data-testid="cbd-category">
          {selection.categoryTitle}
        </span>
        <span className="cbd__selection-value" data-testid="cbd-value">
          {selection.value}
        </span>
      </p>

      {selection.prompt !== null && (
        <div className="cbd__prompt" data-testid="cbd-prompt">
          <MediaContentDisplay content={selection.prompt} />
        </div>
      )}

      {selection.answer !== null && (
        <p className="cbd__answer" data-testid="cbd-answer">
          <span className="cbd__answer-label">Answer</span>
          <span className="cbd__answer-text">{selection.answer}</span>
        </p>
      )}
    </div>
  )
}
