import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createTeamDefinitions } from '../game/teams/definition'
import { TEAM_ACCENTS } from '../game/teams/accents'
import { ClassroomSetupPanel } from './ClassroomSetupPanel'
import { PRIMARY_BUZZ } from '../input/logicalAction'

const TEAMS = createTeamDefinitions([
  { id: 'red', name: 'Team 1', accent: 'crimson' },
  { id: 'blue', name: 'Team 2', accent: 'azure' },
])

/** Ready with optionals unresolved — shared fixture for B+F Ready regressions. */
const READY_OPTIONALS_UNRESOLVED = {
  initialSessionNames: { red: 'Comet Crew', blue: 'Ozone Owls' },
  sonyReady: false,
  displayOpen: false,
  audioUnderstood: false,
} as const

function renderSetup(
  overrides: Partial<Parameters<typeof ClassroomSetupPanel>[0]> = {},
) {
  const onPlay = vi.fn()
  const onPanicMute = vi.fn()
  const onOpenDisplay = vi.fn()
  const onSelectedIdentitiesChange = vi.fn()
  render(
    <ClassroomSetupPanel
      teams={TEAMS}
      teamNameBank={['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']}
      leadership="leader"
      observation={null}
      sonyReady={false}
      displayOpen={false}
      onOpenDisplay={onOpenDisplay}
      audioUnderstood={false}
      audioMuted={false}
      onAudioTest={vi.fn()}
      onPanicMute={onPanicMute}
      playReady={false}
      onPlay={onPlay}
      onSelectedIdentitiesChange={onSelectedIdentitiesChange}
      {...overrides}
    />,
  )
  return { onPlay, onPanicMute, onOpenDisplay, onSelectedIdentitiesChange }
}

describe('ClassroomSetupPanel', () => {
  it('keeps Play disabled while only authored Game names are visible', () => {
    renderSetup()
    expect(screen.getByTestId('setup-play')).toBeDisabled()
    expect(screen.getByTestId('setup-play-blocker')).toHaveTextContent(/still need names/i)
    expect(screen.getByTestId('readiness-names')).toHaveTextContent(/needs attention/i)
    expect(screen.getByTestId('setup-row-names')).toHaveAttribute('data-emphasized', 'true')
    expect(screen.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
    expect(screen.getByTestId('setup-row-teams')).toBeInTheDocument()
    expect(screen.getByTestId('setup-row-buzzers')).toBeInTheDocument()
    expect(screen.getByTestId('setup-row-display')).toBeInTheDocument()
    expect(screen.getByTestId('setup-row-sound')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-ready-heading')).toBeNull()
  })

  it('lets a teacher finish with typed names when Sony is disconnected', () => {
    const { onPlay } = renderSetup({ sonyReady: false })
    expect(screen.getByTestId('readiness-sony')).toHaveTextContent(/optional/i)
    fireEvent.change(screen.getByTestId('tnsb-manual-red'), { target: { value: 'Comet Crew' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-red'))
    fireEvent.change(screen.getByTestId('tnsb-manual-blue'), { target: { value: 'Ozone Owls' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-blue'))
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-ready-heading')).toHaveTextContent(/ready/i)
    fireEvent.click(screen.getByTestId('setup-play'))
    expect(onPlay).toHaveBeenCalled()
  })

  it('does not publish selected identities from a follower window', () => {
    const { onSelectedIdentitiesChange } = renderSetup({ leadership: 'follower' })
    fireEvent.change(screen.getByTestId('tnsb-manual-red'), { target: { value: 'Comet Crew' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-red'))
    expect(onSelectedIdentitiesChange).not.toHaveBeenCalled()
  })

  it('keeps Sony copy free of WebHID and profile identifiers', () => {
    renderSetup()
    expect(screen.getByTestId('setup-sony-copy').textContent).not.toMatch(/WebHID|054c|report id|cqs\.sony/i)
  })

  it('does not nest Mute in Class setup (Mute lives in Host chrome)', () => {
    renderSetup()
    expect(screen.queryByTestId('setup-panic-mute')).toBeNull()
    expect(screen.getByTestId('setup-current-task').textContent).not.toMatch(
      /WebHID|IndexedDB|054c|keepalive/i,
    )
  })

  it('applies a Sony observation without disturbing the other team list', () => {
    const { rerender } = render(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={[
          'Alpha',
          'Bravo',
          'Charlie',
          'Delta',
          'Echo',
          'Foxtrot',
          'Golf',
          'Hotel',
          'India',
          'Juliet',
          'Kilo',
          'Lima',
        ]}
        leadership="leader"
        observation={null}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    const beforeBlue = screen.getByTestId('tnsb-choice-blue-0').textContent
    rerender(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={[
          'Alpha',
          'Bravo',
          'Charlie',
          'Delta',
          'Echo',
          'Foxtrot',
          'Golf',
          'Hotel',
          'India',
          'Juliet',
          'Kilo',
          'Lima',
        ]}
        leadership="leader"
        observation={{ teamId: 'red', action: PRIMARY_BUZZ, at: 1_000 }}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('tnsb-choice-blue-0').textContent).toBe(beforeBlue)
    expect(screen.getByTestId('tnsb-choice-red-0').textContent).toMatch(/India/)
    expect(screen.getByTestId('tnsb-choice-red-0').textContent).not.toBe('YellowAlpha')
  })

  it('applies simultaneous Sony observations for two teams in one batch', () => {
    const { rerender } = render(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={[
          'Alpha',
          'Bravo',
          'Charlie',
          'Delta',
          'Echo',
          'Foxtrot',
          'Golf',
          'Hotel',
          'India',
          'Juliet',
          'Kilo',
          'Lima',
        ]}
        leadership="leader"
        observation={null}
        observationBatch={null}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    const beforeRed = screen.getByTestId('tnsb-choice-red-0').textContent
    const beforeBlue = screen.getByTestId('tnsb-choice-blue-0').textContent
    rerender(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={[
          'Alpha',
          'Bravo',
          'Charlie',
          'Delta',
          'Echo',
          'Foxtrot',
          'Golf',
          'Hotel',
          'India',
          'Juliet',
          'Kilo',
          'Lima',
        ]}
        leadership="leader"
        observation={null}
        observationBatch={[
          { teamId: 'red', action: PRIMARY_BUZZ, at: 2_000 },
          { teamId: 'blue', action: PRIMARY_BUZZ, at: 2_000 },
        ]}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    // Both teams cycle from the same-timestamp batch.
    expect(screen.getByTestId('tnsb-choice-red-0').textContent).not.toBe(beforeRed)
    expect(screen.getByTestId('tnsb-choice-blue-0').textContent).not.toBe(beforeBlue)
  })

  it('applies simultaneous independent color claims without collapsing either team', () => {
    const bank = [
      'Alpha',
      'Bravo',
      'Charlie',
      'Delta',
      'Echo',
      'Foxtrot',
      'Golf',
      'Hotel',
      'India',
      'Juliet',
      'Kilo',
      'Lima',
    ]
    const { rerender } = render(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={bank}
        leadership="leader"
        observation={null}
        observationBatch={null}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    rerender(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={bank}
        leadership="leader"
        observation={null}
        observationBatch={[
          { teamId: 'red', action: { kind: 'secondary', slot: 'secondary4' }, at: 3_000 },
          { teamId: 'blue', action: { kind: 'secondary', slot: 'secondary1' }, at: 3_000 },
        ]}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    // Both independent claims apply from the same poll; Class Setup then
    // compacts. Each team uses its own candidate window (red[0]=Alpha,
    // blue[3]=Hotel for this bank deal).
    expect(screen.getByTestId('setup-names-summary')).toHaveTextContent(/Alpha/)
    expect(screen.getByTestId('setup-names-summary')).toHaveTextContent(/Hotel/)
    expect(screen.queryByTestId('team-name-selection-board')).toBeNull()
  })

  it('keeps one team locked while the other Red-cycles in the same batch', () => {
    const bank = [
      'Alpha',
      'Bravo',
      'Charlie',
      'Delta',
      'Echo',
      'Foxtrot',
      'Golf',
      'Hotel',
      'India',
      'Juliet',
      'Kilo',
      'Lima',
    ]
    const { rerender } = render(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={bank}
        leadership="leader"
        observation={null}
        observationBatch={[
          { teamId: 'red', action: { kind: 'secondary', slot: 'secondary4' }, at: 4_000 },
        ]}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('tnsb-claimed-red')).toHaveTextContent(/Alpha/)
    const blueBefore = screen.getByTestId('tnsb-choice-blue-0').textContent
    rerender(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={bank}
        leadership="leader"
        observation={null}
        observationBatch={[
          { teamId: 'blue', action: PRIMARY_BUZZ, at: 4_040 },
        ]}
        sonyReady
        displayOpen
        onOpenDisplay={vi.fn()}
        audioUnderstood
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('tnsb-claimed-red')).toHaveTextContent(/Alpha/)
    expect(screen.getByTestId('tnsb-choice-blue-0').textContent).not.toBe(blueBefore)
  })

  it('keeps Play available without buzzers and names the required blocker', () => {
    renderSetup({ sonyReady: false })
    expect(screen.getByTestId('setup-play')).toBeDisabled()
    expect(screen.getByTestId('setup-play-blocker').textContent).not.toMatch(/buzzer|sony|webhid/i)
    fireEvent.change(screen.getByTestId('tnsb-manual-red'), { target: { value: 'Comet Crew' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-red'))
    expect(screen.getByTestId('setup-play-blocker')).toHaveTextContent(/Team 2 still needs a name/i)
    fireEvent.change(screen.getByTestId('tnsb-manual-blue'), { target: { value: 'Ozone Owls' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-blue'))
    expect(screen.queryByTestId('setup-play-blocker')).toBeNull()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
  })

  it('compacts completed names and lets the teacher revisit them', () => {
    renderSetup({
      initialSessionNames: { red: 'Comet Crew', blue: 'Ozone Owls' },
      displayOpen: true,
      audioUnderstood: true,
      sonyReady: false,
    })
    expect(screen.getByTestId('setup-names-summary')).toHaveTextContent(/Comet Crew/)
    expect(screen.queryByTestId('team-name-selection-board')).toBeNull()
    fireEvent.click(screen.getByTestId('setup-revisit-names'))
    expect(screen.getByTestId('team-name-selection-board')).toBeVisible()
  })

  it('keeps Class setup focused on names without requiring Mute as the current task', () => {
    renderSetup()
    expect(screen.getByTestId('setup-current-task')).not.toHaveAttribute('data-task', 'sound')
    expect(screen.getByTestId('setup-current-task')).toHaveTextContent(/choose team names/i)
  })

  it('never disables Back to setup when names are incomplete (L0)', () => {
    renderSetup({ playReady: true, initialSessionNames: {} })
    const back = screen.getByTestId('setup-play')
    expect(back).toHaveTextContent(/back to setup/i)
    expect(back).not.toBeDisabled()
  })

  it('labels the ordinary setup CTA Start Game', () => {
    renderSetup()
    expect(screen.getByTestId('setup-play')).toHaveTextContent(/^start game$/i)
  })

  it('shows Ready with Start Game sole dominant while optionals stay unresolved', () => {
    const { onOpenDisplay, onPlay } = renderSetup({ ...READY_OPTIONALS_UNRESOLVED })
    expect(screen.getByTestId('setup-ready-heading')).toHaveTextContent(/ready/i)
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-play')).toHaveClass('classroom-setup__play--dominant')
    expect(screen.getByTestId('setup-open-display-secondary')).toBeVisible()
    expect(screen.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'play')
    expect(screen.queryByTestId('setup-buzzers-task')).toBeNull()
    expect(screen.queryByTestId('setup-display-task')).toBeNull()
    expect(screen.queryByTestId('setup-sound-task')).toBeNull()
    expect(screen.getByTestId('readiness-sony')).toHaveTextContent(/optional/i)
    expect(screen.getByTestId('readiness-sony').textContent).not.toMatch(/needs attention/i)
    expect(screen.getByTestId('readiness-display').textContent).not.toMatch(/needs attention|display ready/i)
    expect(screen.getByTestId('readiness-audio').textContent).toMatch(/not tested/i)
    expect(screen.getByTestId('setup-ready-status').textContent).not.toMatch(/display ready|sound is ready/i)
    expect(document.body.textContent).not.toMatch(/Display ready|Sound is ready/i)

    fireEvent.click(screen.getByTestId('setup-open-display-secondary'))
    expect(onOpenDisplay).toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('setup-row-buzzers').querySelector('button')!)
    expect(screen.getByTestId('setup-buzzers-task')).toBeVisible()
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-optional-tag')).toHaveTextContent(/optional/i)

    fireEvent.click(screen.getByTestId('setup-skip-buzzers'))
    expect(screen.getByTestId('readiness-sony')).toHaveTextContent(/skipped/i)
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()

    fireEvent.click(screen.getByTestId('setup-play'))
    expect(onPlay).toHaveBeenCalled()
  })

  it('revokes Ready when a required name is cleared after Ready', () => {
    renderSetup({
      initialSessionNames: { red: 'Comet Crew', blue: 'Ozone Owls' },
      displayOpen: false,
    })
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    fireEvent.click(screen.getByTestId('setup-revisit-names'))
    fireEvent.click(screen.getByTestId('tnsb-reset-red'))
    expect(screen.queryByTestId('setup-ready-heading')).toBeNull()
    expect(screen.getByTestId('setup-play')).toBeDisabled()
    expect(screen.getByTestId('setup-play-blocker')).toBeVisible()
    expect(screen.getByTestId('readiness-names')).toHaveTextContent(/needs attention/i)
  })

  it('keeps five readiness rows visible and expand survives without changing optional status', () => {
    renderSetup({ ...READY_OPTIONALS_UNRESOLVED })
    for (const id of ['teams', 'names', 'buzzers', 'display', 'sound'] as const) {
      expect(screen.getByTestId(`setup-row-${id}`)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByTestId('readiness-display'))
    expect(screen.getByTestId('setup-display-task')).toBeVisible()
    expect(screen.getByTestId('setup-display-fact')).toHaveTextContent(/window not open/i)
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('readiness-display')).toHaveTextContent(/optional/i)
    expect(screen.getByTestId('setup-row-display')).toHaveAttribute('data-emphasized', 'false')
  })

  it('keeps Start Game sole dominant when Display is expanded while Ready', () => {
    renderSetup({ ...READY_OPTIONALS_UNRESOLVED })
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-play')).toHaveClass('classroom-setup__play--dominant')

    fireEvent.click(screen.getByTestId('readiness-display'))
    expect(screen.getByTestId('setup-display-task')).toBeVisible()
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-play')).toHaveClass('classroom-setup__play--dominant')

    const openDisplay = screen.getByTestId('setup-open-display')
    expect(openDisplay).toBeVisible()
    expect(openDisplay).toHaveClass('btn--secondary')
    expect(openDisplay).not.toHaveClass('classroom-setup__play--dominant')
    expect(openDisplay.className.split(/\s+/)).not.toContain('btn--primary')
  })

  it('keeps eight-team Ready workspace usable without horizontal overflow of the outcome strip', () => {
    const eight = createTeamDefinitions(
      Array.from({ length: 8 }, (_, i) => ({
        id: `t${i}`,
        name: `Team ${i + 1}`,
        accent: TEAM_ACCENTS[i]!,
      })),
    )
    const names = Object.fromEntries(eight.map((team, i) => [team.id, `Classroom Squad ${i + 1}`]))
    renderSetup({
      ...READY_OPTIONALS_UNRESOLVED,
      teams: eight,
      initialSessionNames: names,
    })
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-play')).toHaveClass('classroom-setup__play--dominant')
    expect(screen.getByTestId('setup-outcome-strip')).toBeVisible()
    expect(screen.getByTestId('readiness-teams')).toHaveTextContent(/8 teams/i)
    expect(screen.getByTestId('setup-names-summary')).toHaveTextContent(/Classroom Squad 8/)
  })

  it('keeps Start Game sole dominant when Teams is revisited while Ready', () => {
    const onEditGame = vi.fn()
    renderSetup({ ...READY_OPTIONALS_UNRESOLVED, onEditGame })
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-play')).toHaveClass('classroom-setup__play--dominant')

    fireEvent.click(screen.getByTestId('readiness-teams'))
    expect(screen.getByTestId('setup-teams-task')).toBeVisible()
    expect(screen.getByTestId('setup-ready-heading')).toBeVisible()
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    expect(screen.getByTestId('setup-play')).toHaveClass('classroom-setup__play--dominant')

    const edit = screen.getByTestId('setup-edit-game')
    expect(edit).toBeVisible()
    expect(edit).toHaveClass('btn--secondary')
    expect(edit.className.split(/\s+/)).not.toContain('btn--primary')
    expect(edit).not.toHaveClass('classroom-setup__play--dominant')
  })

  it('keeps Edit this game primary when Teams are blocked (0-team repair)', () => {
    renderSetup({ teams: [], onEditGame: vi.fn() })
    const edit = screen.getByTestId('setup-edit-game')
    expect(edit).toBeVisible()
    expect(edit).toHaveClass('btn')
    expect(edit).not.toHaveClass('btn--secondary')
  })

  it('keeps Edit this game secondary when Teams are valid but Names still required', () => {
    renderSetup({ onEditGame: vi.fn(), initialSessionNames: {} })
    fireEvent.click(screen.getByTestId('readiness-teams'))
    const edit = screen.getByTestId('setup-edit-game')
    expect(edit).toHaveClass('btn--secondary')
    expect(screen.getByTestId('setup-play')).toBeDisabled()
  })

  it('mounts Class Setup for 0-team with Teams/Names blocked, Start disabled, and Edit CTA', () => {
    const onEditGame = vi.fn()
    renderSetup({ teams: [], onEditGame })
    expect(screen.getByTestId('classroom-setup')).toBeVisible()
    for (const id of ['teams', 'names', 'buzzers', 'display', 'sound'] as const) {
      expect(screen.getByTestId(`setup-row-${id}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('readiness-teams')).toHaveAttribute('data-status', 'blocked')
    expect(screen.getByTestId('readiness-names')).toHaveAttribute('data-status', 'blocked')
    expect(screen.getByTestId('setup-play')).toBeDisabled()
    expect(screen.getByTestId('setup-play-blocker')).toHaveTextContent(/still needs teams/i)
    expect(screen.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'teams')
    expect(screen.getByTestId('setup-edit-game')).toBeVisible()
    fireEvent.click(screen.getByTestId('setup-edit-game'))
    expect(onEditGame).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('setup-ready-heading')).toBeNull()
    expect(screen.queryByTestId('tnsb-manual-red')).toBeNull()
  })

  it('hides name controls when Names is expanded while teams are blocked', () => {
    renderSetup({ teams: [] })
    fireEvent.click(screen.getByTestId('readiness-names'))
    expect(screen.getByTestId('setup-names-task')).toBeVisible()
    expect(screen.getByTestId('setup-names-blocked-copy')).toHaveTextContent(/finish teams/i)
    expect(screen.queryByTestId('setup-sony-copy')).toBeNull()
    expect(document.body.querySelectorAll('[data-testid^="tnsb-manual-"]')).toHaveLength(0)
  })

  it('uses keyboard-honest Names copy when wbuzzPresent is false', () => {
    renderSetup({ wbuzzPresent: false })
    const copy = screen.getByTestId('setup-sony-copy').textContent ?? ''
    expect(copy).toMatch(/type a name/i)
    expect(copy).toMatch(/keyboard always works/i)
    expect(copy).not.toMatch(/Blue|Orange|Green|Yellow|Red/)
  })

  it('allows colour-press Names guidance only when wbuzzPresent is true', () => {
    renderSetup({ wbuzzPresent: true })
    const copy = screen.getByTestId('setup-sony-copy').textContent ?? ''
    expect(copy).toMatch(/Blue, Orange, Green, or Yellow/)
    expect(copy).toMatch(/type a name/i)
    expect(copy).toMatch(/keyboard always works/i)
  })

  it('reseeds name selection when team roster signature changes', () => {
    const onSelectedIdentitiesChange = vi.fn()
    const { rerender } = render(
      <ClassroomSetupPanel
        teams={TEAMS}
        teamNameBank={['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']}
        leadership="leader"
        observation={null}
        sonyReady={false}
        displayOpen={false}
        onOpenDisplay={vi.fn()}
        audioUnderstood={false}
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={onSelectedIdentitiesChange}
      />,
    )
    fireEvent.change(screen.getByTestId('tnsb-manual-red'), { target: { value: 'Comet Crew' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-red'))
    expect(onSelectedIdentitiesChange).toHaveBeenCalled()

    const grown = createTeamDefinitions([
      { id: 'red', name: 'Team 1', accent: 'crimson' },
      { id: 'blue', name: 'Team 2', accent: 'azure' },
      { id: 'green', name: 'Team 3', accent: 'emerald' },
    ])
    rerender(
      <ClassroomSetupPanel
        teams={grown}
        teamNameBank={['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']}
        leadership="leader"
        observation={null}
        sonyReady={false}
        displayOpen={false}
        onOpenDisplay={vi.fn()}
        audioUnderstood={false}
        audioMuted={false}
        onAudioTest={vi.fn()}
        onPanicMute={vi.fn()}
        playReady={false}
        onPlay={vi.fn()}
        onSelectedIdentitiesChange={onSelectedIdentitiesChange}
      />,
    )
    expect(screen.getByTestId('tnsb-manual-green')).toBeInTheDocument()
    expect(screen.getByTestId('setup-play')).toBeDisabled()
    expect(screen.getByTestId('readiness-names')).toHaveAttribute('data-status', 'needs-attention')
  })
})
