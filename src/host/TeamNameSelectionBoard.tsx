import { useState } from 'react'
import { TEAM_NAME_CHOICE_COLORS, type TeamNameSelectionView } from '../session/teamNameSelection'
import { choiceColorLabel } from '../input/sonyNameSelection'
import './TeamNameSelectionBoard.css'

export interface TeamNameSelectionBoardProps {
  readonly views: readonly TeamNameSelectionView[]
  readonly teamLabels: Readonly<Record<string, string>>
  readonly onClaim: (teamId: string, choiceIndex: 0 | 1 | 2 | 3) => void
  readonly onCycle: (teamId: string) => void
  readonly onManual: (teamId: string, name: string) => void
  readonly onReset: (teamId: string) => void
  readonly reducedMotion?: boolean
  readonly highContrast?: boolean
  readonly grayscale?: boolean
}

export function TeamNameSelectionBoard({
  views,
  teamLabels,
  onClaim,
  onCycle,
  onManual,
  onReset,
  reducedMotion = false,
  highContrast = false,
  grayscale = false,
}: TeamNameSelectionBoardProps) {
  return (
    <div
      className="tnsb"
      data-testid="team-name-selection-board"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-high-contrast={highContrast ? 'true' : 'false'}
      data-grayscale={grayscale ? 'true' : 'false'}
    >
      {views.map((view) => (
        <article
          key={view.teamId}
          className={`tnsb__team${view.claimedName ? ' tnsb__team--claimed' : ''}`}
          data-testid={`tnsb-team-${view.teamId}`}
        >
          <header className="tnsb__header">
            <h3 className="tnsb__title">{teamLabels[view.teamId] ?? view.teamId}</h3>
            {view.claimedName ? (
              <p className="tnsb__claimed" data-testid={`tnsb-claimed-${view.teamId}`}>
                Selected: {view.claimedName}
              </p>
            ) : (
              <p className="tnsb__hint">Press a color or type a name.</p>
            )}
          </header>
          <ol className="tnsb__choices">
            {TEAM_NAME_CHOICE_COLORS.map((color, index) => {
              const choiceIndex = index as 0 | 1 | 2 | 3
              const name = view.candidates[choiceIndex] ?? '—'
              const selected = view.selectedChoiceIndex === choiceIndex
              const subdued = view.claimedName !== null && !selected
              return (
                <li key={color}>
                  <button
                    type="button"
                    className={`tnsb__choice tnsb__choice--${color}${selected ? ' tnsb__choice--selected' : ''}${
                      subdued ? ' tnsb__choice--subdued' : ''
                    }`}
                    data-testid={`tnsb-choice-${view.teamId}-${choiceIndex}`}
                    data-color={color}
                    data-ordinal={choiceIndex + 1}
                    disabled={view.claimedName !== null}
                    aria-label={`${choiceColorLabel(color, choiceIndex)}: ${name}`}
                    onClick={() => onClaim(view.teamId, choiceIndex)}
                  >
                    <span className="tnsb__ordinal" aria-hidden="true">
                      {choiceIndex + 1} · {color}
                    </span>
                    <span className="tnsb__name">{name}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="tnsb__actions">
            <button
              type="button"
              className="btn btn--secondary"
              data-testid={`tnsb-cycle-${view.teamId}`}
              disabled={view.claimedName !== null}
              onClick={() => onCycle(view.teamId)}
            >
              More names
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid={`tnsb-reset-${view.teamId}`}
              onClick={() => onReset(view.teamId)}
            >
              Choose again
            </button>
            <ManualNameField
              key={`${view.teamId}-${view.claimedName ?? ''}`}
              teamId={view.teamId}
              claimedName={view.claimedName}
              onManual={onManual}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

function ManualNameField({
  teamId,
  claimedName,
  onManual,
}: {
  readonly teamId: string
  readonly claimedName: string | null
  readonly onManual: (teamId: string, name: string) => void
}) {
  const [draft, setDraft] = useState(claimedName ?? '')
  const commit = () => {
    if (draft.trim().length === 0) return
    onManual(teamId, draft)
  }
  return (
    <label className="tnsb__manual" htmlFor={`tnsb-manual-${teamId}`}>
      Type a name
      <input
        id={`tnsb-manual-${teamId}`}
        data-testid={`tnsb-manual-${teamId}`}
        value={draft}
        maxLength={40}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
        }}
      />
    </label>
  )
}
