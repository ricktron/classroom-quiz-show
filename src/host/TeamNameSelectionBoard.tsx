import { useEffect, useState } from 'react'
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
  /**
   * Court B CB-03: the text currently typed in a team's name field, reported on
   * mount and on every change, so Class Setup can count a visibly typed name
   * toward readiness before it is committed by Enter / blur.
   */
  readonly onDraft?: (teamId: string, draft: string | null) => void
  /**
   * Q7 R1 item 8: whether this Game has a class name list to choose from.
   * Without one, colour choices, "More names" and "Choose again" would be live
   * but do nothing, so they are not rendered; typing a name stays fully usable
   * and a typed name can be cleared. Defaults to true (unchanged behavior).
   */
  readonly nameBankAvailable?: boolean
  readonly reducedMotion?: boolean
  readonly highContrast?: boolean
  readonly grayscale?: boolean
}

/**
 * Visual top-to-bottom order matching the physical Sony Wireless Buzz
 * colored buttons. Logical choiceIndex mapping is unchanged:
 * 0 yellow, 1 green, 2 orange, 3 blue.
 */
export const TEAM_NAME_CHOICE_DISPLAY_ORDER = [3, 2, 1, 0] as const

export function TeamNameSelectionBoard({
  views,
  teamLabels,
  onClaim,
  onCycle,
  onManual,
  onReset,
  onDraft,
  nameBankAvailable = true,
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
      data-name-bank={nameBankAvailable ? 'available' : 'none'}
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
              <p className="tnsb__hint">
                {nameBankAvailable ? 'Press a color or type a name.' : 'Type a name.'}
              </p>
            )}
          </header>
          {nameBankAvailable && (
            <ol className="tnsb__choices">
              {TEAM_NAME_CHOICE_DISPLAY_ORDER.map((choiceIndex) => {
                const color = TEAM_NAME_CHOICE_COLORS[choiceIndex]
                const name = view.candidates[choiceIndex] ?? '—'
                const selected = view.selectedChoiceIndex === choiceIndex
                const subdued = view.claimedName !== null && !selected
                const colorWord = color[0]!.toUpperCase() + color.slice(1)
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
                        {colorWord}
                      </span>
                      <span className="tnsb__name">{name}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
          <div className="tnsb__actions">
            {nameBankAvailable ? (
              <>
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
              </>
            ) : (
              view.claimedName !== null && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  data-testid={`tnsb-reset-${view.teamId}`}
                  onClick={() => onReset(view.teamId)}
                >
                  Clear name
                </button>
              )
            )}
            <ManualNameField
              key={`${view.teamId}-${view.claimedName ?? ''}`}
              teamId={view.teamId}
              claimedName={view.claimedName}
              onManual={onManual}
              onDraft={onDraft}
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
  onDraft,
}: {
  readonly teamId: string
  readonly claimedName: string | null
  readonly onManual: (teamId: string, name: string) => void
  readonly onDraft?: (teamId: string, draft: string | null) => void
}) {
  const [draft, setDraft] = useState(claimedName ?? '')
  // Report the field's real text on mount (a remount resets it to the claimed
  // name) and withdraw it on unmount, so Class Setup only ever counts text that
  // is visibly typed in a mounted field (never a hidden or stale draft).
  useEffect(() => {
    onDraft?.(teamId, claimedName ?? '')
    return () => onDraft?.(teamId, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- teamId and claimedName are part of this field's key, so they never change for one mount
  }, [])
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
        onChange={(event) => {
          setDraft(event.target.value)
          onDraft?.(teamId, event.target.value)
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
        }}
      />
    </label>
  )
}
