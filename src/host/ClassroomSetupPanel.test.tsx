import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createTeamDefinitions } from '../game/teams/definition'
import { ClassroomSetupPanel } from './ClassroomSetupPanel'
import { PRIMARY_BUZZ } from '../input/logicalAction'

const TEAMS = createTeamDefinitions([
  { id: 'red', name: 'Team 1', accent: 'crimson' },
  { id: 'blue', name: 'Team 2', accent: 'azure' },
])

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
    expect(screen.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
    expect(screen.queryByTestId('setup-display-preview')).toBeNull()
  })

  it('lets a teacher finish with typed names when Sony is disconnected', () => {
    const { onPlay } = renderSetup({ sonyReady: false })
    expect(screen.getByTestId('readiness-sony')).toHaveTextContent(/optional/i)
    fireEvent.change(screen.getByTestId('tnsb-manual-red'), { target: { value: 'Comet Crew' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-red'))
    fireEvent.change(screen.getByTestId('tnsb-manual-blue'), { target: { value: 'Ozone Owls' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-blue'))
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
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

  it('exposes panic mute and does not put teacher diagnostics on the current task', () => {
    const { onPanicMute } = renderSetup()
    fireEvent.click(screen.getByTestId('setup-panic-mute'))
    expect(onPanicMute).toHaveBeenCalled()
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

  it('keeps Mute all sounds available without making it the current task', () => {
    renderSetup()
    expect(screen.getByTestId('setup-panic-mute')).toBeVisible()
    expect(screen.getByTestId('setup-current-task')).not.toHaveAttribute('data-task', 'sound')
    expect(screen.getByTestId('setup-current-task')).toHaveTextContent(/choose team names/i)
  })
})
