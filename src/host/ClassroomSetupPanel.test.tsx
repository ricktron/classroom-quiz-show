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
  const onSessionNamesChange = vi.fn()
  render(
    <ClassroomSetupPanel
      sessionId="period-1"
      gameId="game-1"
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
      onSessionNamesChange={onSessionNamesChange}
      {...overrides}
    />,
  )
  return { onPlay, onPanicMute, onOpenDisplay, onSessionNamesChange }
}

describe('ClassroomSetupPanel', () => {
  it('lets a teacher finish with typed names when Sony is disconnected', () => {
    const { onPlay } = renderSetup({ sonyReady: false })
    expect(screen.getByTestId('readiness-sony')).toHaveTextContent(/keyboard fallback/i)
    fireEvent.change(screen.getByTestId('tnsb-manual-red'), { target: { value: 'Comet Crew' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-red'))
    fireEvent.change(screen.getByTestId('tnsb-manual-blue'), { target: { value: 'Ozone Owls' } })
    fireEvent.blur(screen.getByTestId('tnsb-manual-blue'))
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('setup-play'))
    expect(onPlay).toHaveBeenCalled()
  })

  it('keeps Sony copy free of WebHID and profile identifiers', () => {
    renderSetup()
    expect(screen.getByTestId('setup-sony-copy').textContent).not.toMatch(/WebHID|054c|report id|cqs\.sony/i)
  })

  it('exposes panic mute and does not put teacher diagnostics on the preview', () => {
    const { onPanicMute } = renderSetup()
    fireEvent.click(screen.getByTestId('setup-panic-mute'))
    expect(onPanicMute).toHaveBeenCalled()
    const preview = screen.getByTestId('setup-display-preview')
    expect(preview.textContent).not.toMatch(/WebHID|IndexedDB|054c|keepalive/i)
  })

  it('applies a Sony observation without disturbing the other team list', () => {
    const { rerender } = render(
      <ClassroomSetupPanel
        sessionId="period-1"
        gameId="game-1"
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
        onSessionNamesChange={vi.fn()}
      />,
    )
    const beforeBlue = screen.getByTestId('tnsb-choice-blue-0').textContent
    rerender(
      <ClassroomSetupPanel
        sessionId="period-1"
        gameId="game-1"
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
        onSessionNamesChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('tnsb-choice-blue-0').textContent).toBe(beforeBlue)
    expect(screen.getByTestId('tnsb-choice-red-0').textContent).toMatch(/India/)
    expect(screen.getByTestId('tnsb-choice-red-0').textContent).not.toBe('1 · yellowAlpha')
  })
})
